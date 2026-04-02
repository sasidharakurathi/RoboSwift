use regex::Regex;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

pub struct TransferState {
    pub child_pid: Mutex<Option<u32>>,
}

#[derive(Clone, serde::Serialize)]
struct TransferTick {
    current_file: Option<String>,
    progress: Option<String>,
    speed: Option<String>,
    log_line: String,
}

fn is_valid_flag(flag: &str) -> bool {
    let flag_upper = flag.to_uppercase();
    match flag_upper.as_str() {
        "/MIR" | "/Z" | "/XO" | "/S" | "/SEC" | "/ETA" | "/MT" => true,
        _ if flag_upper.starts_with("/MT:") => flag_upper[4..].parse::<u32>().is_ok(),
        _ if flag_upper.starts_with("/W:") => flag_upper[3..].parse::<u32>().is_ok(),
        _ => false,
    }
}

#[tauri::command]
fn start_transfer(
    app: AppHandle,
    state: State<'_, TransferState>,
    source: String,
    destination: String,
    flags: Vec<String>,
) -> Result<(), String> {
    let source = source.trim();
    let destination = destination.trim();

    if source.is_empty() || source.starts_with('/') {
        return Err("Invalid source path: cannot be empty or start with '/'".into());
    }
    if destination.is_empty() || destination.starts_with('/') {
        return Err("Invalid destination path: cannot be empty or start with '/'".into());
    }

    for flag in &flags {
        if !is_valid_flag(flag) {
            return Err(format!("Invalid or disallowed flag: {}", flag));
        }
    }

    {
        let pid_guard = state.child_pid.lock().unwrap();
        if pid_guard.is_some() {
            return Err("A transfer is already running.".into());
        }
    }

    let mut command = Command::new("robocopy");
    command.arg(&source).arg(&destination);

    for flag in flags {
        command.arg(&flag);
    }

    // Critical: Strip headers/directories for parseable output
    command.args(["/NJH", "/NJS", "/NDL"]);
    command.stdout(Stdio::piped());

    // Prevent cmd terminal popups on Windows
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);

    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to start robocopy: {}", e)),
    };

    let pid = child.id();
    {
        *state.child_pid.lock().unwrap() = Some(pid);
    }

    let stdout = child.stdout.take().expect("Failed to open stdout");
    let app_clone = app.clone();

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let re_progress = Regex::new(r"(\d+\.?\d+%)").unwrap();
        let re_speed = Regex::new(r"(\d+\.?\d*\s*[KMG]?/?Sec)").unwrap();

        for line in reader.lines() {
            if let Ok(line_str) = line {
                let progress = re_progress
                    .captures(&line_str)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str().to_string());

                let speed = re_speed
                    .captures(&line_str)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str().to_string());

                let trimmed = line_str.trim();
                let mut current_file = None;
                if !trimmed.is_empty() && trimmed.contains('\\') {
                    let cleaned = re_progress.replace(trimmed, "").to_string();
                    let cleaned = cleaned.trim().to_string();
                    if !cleaned.is_empty() {
                        current_file = Some(cleaned);
                    }
                }

                let tick = TransferTick {
                    current_file,
                    progress,
                    speed,
                    log_line: line_str.clone(),
                };

                let _ = app_clone.emit("transfer-tick", tick);
            }
        }

        let _ = child.wait();
        let state = app_clone.state::<TransferState>();
        *state.child_pid.lock().unwrap() = None;
        let _ = app_clone.emit("transfer-complete", ());
    });

    Ok(())
}

#[tauri::command]
fn cancel_transfer(state: State<'_, TransferState>) -> Result<(), String> {
    let mut pid_guard = state.child_pid.lock().unwrap();
    if let Some(pid) = *pid_guard {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .creation_flags(0x08000000)
                .status();
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .status();
        }

        *pid_guard = None;
        Ok(())
    } else {
        Err("No active transfer to cancel.".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(TransferState {
            child_pid: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![start_transfer, cancel_transfer])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_flag() {
        assert!(is_valid_flag("/MIR"));
        assert!(is_valid_flag("/mir"));
        assert!(is_valid_flag("/Z"));
        assert!(is_valid_flag("/XO"));
        assert!(is_valid_flag("/S"));
        assert!(is_valid_flag("/SEC"));
        assert!(is_valid_flag("/ETA"));
        assert!(is_valid_flag("/MT"));
        assert!(is_valid_flag("/MT:16"));
        assert!(is_valid_flag("/MT:128"));
        assert!(is_valid_flag("/W:5"));
        assert!(is_valid_flag("/W:0"));

        assert!(!is_valid_flag("/LOG:C:\\malicious.txt"));
        assert!(!is_valid_flag("/MT:abc"));
        assert!(!is_valid_flag("/W:"));
        assert!(!is_valid_flag("/R:1"));
        assert!(!is_valid_flag(""));
        assert!(!is_valid_flag("/JOB:malicious"));
    }
}
