import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Tooltip } from './components/Tooltip';

// Interface matching the Rust payload
interface TransferTick {
    current_file: string | null;
    progress: string | null;
    speed: string | null;
    log_line: string;
}

interface LogEntry {
    id: number;
    time: string;
    status: string;
    filename: string;
}

let logCounter = 0;

const FLAG_CONFIG: Record<string, { icon: string; tooltip: string }> = {
    '/MIR': {
        icon: 'check_circle',
        tooltip: 'Mirror Mode. Copies all subdirectories and DELETES files in destination that no longer exist in source.'
    },
    '/MT:16': {
        icon: 'bolt',
        tooltip: 'Multi-threaded (16 cores). Significantly speeds up transfer by copying multiple files simultaneously.'
    },
    '/Z': {
        icon: 'verified_user',
        tooltip: 'Restartable Mode. Allows robocopy to resume a partially completed file transfer after a network failure.'
    },
    '/XO': {
        icon: 'update',
        tooltip: 'Exclude Older. Skips files in the source that are older than the ones already in the destination.'
    },
    '/S': {
        icon: 'subtitles',
        tooltip: 'Subdirectories. Copies all subdirectories but excludes empty ones.'
    },
    '/SEC': {
        icon: 'security',
        tooltip: 'Copy Security. Preserves NTFS permissions, ownership, and auditing information (ACLs).'
    },
    '/W:5': {
        icon: 'timer',
        tooltip: 'Wait Time (5s). Sets the duration to wait between retries if a file copy fails.'
    },
    '/ETA': {
        icon: 'rule',
        tooltip: 'Show Estimated Time. Displays the approximate time remaining for the current file transfer.'
    }
};

export default function App() {
    const [sourcePath, setSourcePath] = useState("C:\\Users\\Admin\\Production\\Assets_2024");
    const [destPath, setDestPath] = useState("Z:\\Backups\\Daily_Archive\\Vault_01");
    const [activeFlags, setActiveFlags] = useState<string[]>(['/MIR', '/MT:16', '/Z']);

    // Engine state
    const [isRunning, setIsRunning] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    // HUD stats
    const [currentFile, setCurrentFile] = useState<string>("Ready...");
    const [progressStr, setProgressStr] = useState<string>("0%");
    const [speed, setSpeed] = useState<string>("Wait...");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [numFilesProcessed, setNumFilesProcessed] = useState(0);

    useEffect(() => {
        let unlistenTick: (() => void) | undefined;
        let unlistenComplete: (() => void) | undefined;

        const setupListeners = async () => {
            unlistenTick = await listen<TransferTick[]>('transfer-tick', (event) => {
                const ticks = event.payload;
                if (!ticks || ticks.length === 0) return;

                let latestCurrentFile: string | null = null;
                let latestProgress: string | null = null;
                let latestSpeed: string | null = null;

                const newLogs: LogEntry[] = [];
                let newFilesProcessedCount = 0;
                const time = new Date().toLocaleTimeString('en-US', { hour12: false });

                for (const tick of ticks) {
                    if (tick.current_file) latestCurrentFile = tick.current_file;
                    if (tick.progress) latestProgress = tick.progress;
                    if (tick.speed) latestSpeed = tick.speed;

                    if (tick.log_line.trim().length > 0) {
                        newFilesProcessedCount++;
                        const status = tick.progress ? "[ACTIVE]" : "[COPIED]";
                        const filename = tick.current_file || tick.log_line.trim();
                        newLogs.unshift({ id: logCounter++, time, status, filename });
                    }
                }

                if (latestCurrentFile) {
                    setCurrentFile(latestCurrentFile);
                }

                if (latestProgress) {
                    setProgressStr(latestProgress);
                }

                if (latestSpeed) {
                    setSpeed(latestSpeed);
                }

                if (newFilesProcessedCount > 0) {
                    setNumFilesProcessed(prev => prev + newFilesProcessedCount);
                    setLogs((prev) => [...newLogs, ...prev].slice(0, 100));
                }
            });

            unlistenComplete = await listen('transfer-complete', () => {
                setIsRunning(false);
                setIsCompleted(true);
                setCurrentFile("Transfer fully completed.");
                setProgressStr("100%");
            });
        };

        setupListeners();

        return () => {
            if (unlistenTick) unlistenTick();
            if (unlistenComplete) unlistenComplete();
        };
    }, []);

    const handleBrowseSource = async () => {
        if (isRunning) return;
        const selected = await open({
            directory: true,
            multiple: false,
        });
        if (selected) {
            setSourcePath(selected as string);
        }
    };

    const handleBrowseDest = async () => {
        if (isRunning) return;
        const selected = await open({
            directory: true,
            multiple: false,
        });
        if (selected) {
            setDestPath(selected as string);
        }
    };

    const toggleFlag = (flag: string) => {
        if (isRunning) return;
        setActiveFlags(prev =>
            prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
        );
    };

    const startTransfer = async () => {
        if (isRunning) return;

        try {
            setIsRunning(true);
            setIsCompleted(false);
            setLogs([]);
            setProgressStr("0%");
            setNumFilesProcessed(0);
            setSpeed("Init...");
            logCounter = 0;

            await invoke('start_transfer', {
                source: sourcePath,
                destination: destPath,
                flags: activeFlags,
            });
        } catch (err) {
            console.error(err);
            setIsRunning(false);
            alert(err);
        }
    };

    const cancelTransfer = async () => {
        try {
            await invoke('cancel_transfer');
            setIsRunning(false);
        } catch (err) {
            console.error(err);
        }
    };

    const getFlagClass = (flag: string) => {
        const isActive = activeFlags.includes(flag);
        const disabledState = isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

        return isActive
            ? `bg-primary-container text-on-primary-container p-3 rounded-sm text-xs font-bold flex flex-col gap-1 border-r-2 border-on-primary-container/20 w-full h-full ${disabledState}`
            : `bg-surface-container-highest text-on-surface-variant p-3 rounded-sm text-xs font-bold flex flex-col gap-1 w-full h-full ${!isRunning && 'hover:bg-surface-container-high transition-colors'} ${disabledState}`;
    };

    const getFlagTooltip = (flag: string) => FLAG_CONFIG[flag]?.tooltip || "";

    const generatedCommand = `robocopy "${sourcePath}" "${destPath}" ${activeFlags.length > 0 ? activeFlags.join(' ') + ' ' : ''}/V /TS /FP /LOG:robolog.txt`;

    const speedParts = speed.split(' ');

    return (
        <>
            <main className="pt-20 pb-24 min-h-screen">
                <div className="w-full px-8 md:px-12 xl:px-16 space-y-12">
                    {/* Section 1: Paths */}
                    <section className="space-y-6">
                        <div className="flex items-baseline justify-between">
                            <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface uppercase">Initialize Transfer</h1>
                            <span className="font-mono text-xs text-primary/60">V.2.4.0_DEPLOYED</span>
                        </div>
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-[10px] font-mono text-on-surface-variant mb-1 ml-1 uppercase tracking-widest">Source Directory</label>
                                <div className={`flex items-center gap-px bg-surface-container-low transition-colors border-b-2 border-transparent ${isRunning ? 'opacity-50' : 'focus-within:bg-surface-container-high focus-within:border-primary'}`}>
                                    <input
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-on-surface py-4 px-4 outline-none"
                                        placeholder="Select source folder..."
                                        type="text"
                                        value={sourcePath}
                                        disabled={isRunning}
                                        onChange={(e) => setSourcePath(e.target.value)}
                                    />
                                    <Tooltip content="Click to select the primary directory containing the files you wish to migrate.">
                                        <button
                                            onClick={handleBrowseSource}
                                            disabled={isRunning}
                                            className="px-6 py-4 bg-secondary-container/20 hover:bg-secondary-container/40 text-secondary transition-colors font-bold text-xs tracking-widest flex items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed h-full"
                                        >
                                            <span className="material-symbols-outlined text-sm">folder_open</span>
                                            BROWSE
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-mono text-on-surface-variant mb-1 ml-1 uppercase tracking-widest">Destination Node</label>
                                <div className={`flex items-center gap-px bg-surface-container-low transition-colors border-b-2 border-transparent ${isRunning ? 'opacity-50' : 'focus-within:bg-surface-container-high focus-within:border-primary'}`}>
                                    <input
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-on-surface py-4 px-4 outline-none"
                                        placeholder="Select destination folder..."
                                        type="text"
                                        value={destPath}
                                        disabled={isRunning}
                                        onChange={(e) => setDestPath(e.target.value)}
                                    />
                                    <Tooltip content="Click to select the target node or directory where the files will be replicated.">
                                        <button
                                            onClick={handleBrowseDest}
                                            disabled={isRunning}
                                            className="px-6 py-4 bg-secondary-container/20 hover:bg-secondary-container/40 text-secondary transition-colors font-bold text-xs tracking-widest flex items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed h-full"
                                        >
                                            <span className="material-symbols-outlined text-sm">lan</span>
                                            BROWSE
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Flags & Code */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <h2 className="text-sm font-black tracking-widest text-on-surface-variant uppercase flex items-center gap-2">
                                <span className={`w-2 h-2 ${isRunning ? 'bg-error animate-pulse' : 'bg-primary'} rounded-full`}></span>
                                Execution Flags
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                                {Object.keys(FLAG_CONFIG).map((flag) => (
                                    <Tooltip key={flag} content={getFlagTooltip(flag)} className="w-full h-full">
                                        <button onClick={() => toggleFlag(flag)} disabled={isRunning} className={getFlagClass(flag)}>
                                            <span className="material-symbols-outlined text-sm">
                                                {FLAG_CONFIG[flag].icon}
                                            </span>
                                            {flag}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-sm font-black tracking-widest text-on-surface-variant uppercase">Generated String</h2>
                            <Tooltip content="Command Preview: This represents the literal string that will be executed via the system's robocopy engine." position="bottom" className="w-full">
                                <div className="bg-surface-container p-4 h-[124px] overflow-y-auto rounded-sm border-l-2 border-primary-dim w-full">
                                    <code className="text-[11px] font-mono text-primary leading-relaxed break-all">
                                        {generatedCommand}
                                    </code>
                                </div>
                            </Tooltip>
                        </div>
                    </section>

                    {/* Section 3: Progress & HUD */}
                    <section className="space-y-8 bg-surface-container-low p-8 rounded-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 pointer-events-none p-4">
                            <span className="material-symbols-outlined text-[120px]">monitoring</span>
                        </div>
                        <div className="grid grid-cols-3 gap-12 relative z-10">
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Network Throughput</div>
                                <div className="text-2xl lg:text-4xl font-headline font-black text-on-surface">
                                    {speedParts[0] || speed} <span className="text-sm font-normal text-primary">{speedParts.slice(1).join(' ')}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Global Status</div>
                                <div className={`text-2xl lg:text-4xl font-headline font-black ${isCompleted ? 'text-green-400' : 'text-on-surface'}`}>
                                    {isRunning ? 'RUNNING' : isCompleted ? 'DONE' : 'IDLE'}
                                    <span className="text-sm font-normal text-primary"> APP</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Processed Objects</div>
                                <div className="text-2xl lg:text-4xl font-headline font-black text-on-surface">{numFilesProcessed.toLocaleString()} <span className="text-sm font-normal text-primary">SCANS</span></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-mono uppercase">
                                    <span className="text-on-surface-variant">Total Volume Progress</span>
                                    <span className="text-primary font-bold">{progressStr}</span>
                                </div>
                                <div className="h-2 bg-surface-container-highest w-full rounded-full overflow-hidden">
                                    <div className={`${isCompleted ? 'bg-green-500' : 'kinetic-gradient'} h-full transition-all duration-300`} style={{ width: progressStr, boxShadow: isCompleted ? "0 0 12px rgba(34, 197, 94, 0.4)" : "0 0 12px rgba(133, 173, 255, 0.4)" }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-mono uppercase">
                                    <span className="text-on-surface-variant truncate mr-4">Active: {currentFile}</span>
                                    <span className="text-on-surface-variant flex-shrink-0">{progressStr === "100%" ? "DONE" : progressStr}</span>
                                </div>
                                <div className="h-1 bg-surface-container-highest w-full rounded-full overflow-hidden">
                                    <div className="bg-primary/40 h-full transition-all duration-300" style={{ width: progressStr }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 border-t border-outline-variant/15 pt-6">
                            <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-4">Real-time Stream</div>
                            <div className="space-y-2 font-mono text-[11px] h-40 overflow-y-auto pr-2">
                                {logs.length === 0 && <div className="text-on-surface-variant italic">Waiting for pipeline...</div>}
                                {logs.map((log, index) => (
                                    <div key={log.id} className={`flex gap-4 ${index === 0 && isRunning ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`}>
                                        <span className="text-primary-dim flex-shrink-0">{log.time}</span>
                                        <span className={index === 0 && isRunning ? "font-bold flex-shrink-0" : "text-on-surface flex-shrink-0"}>{log.status}</span>
                                        <span className="truncate">{log.filename}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-[#0e0e0e] border-t border-[#494847]/15">
                <div className="hidden sm:flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-error animate-pulse' : isCompleted ? 'bg-green-500' : 'bg-primary animate-ping'}`}></span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#adaaaa]">
                        {isRunning ? 'PIPELINE ACTIVE | PROCESSING' : isCompleted ? 'TRANSFER FINISHED' : 'SYSTEM READY FOR OVERWRITE'}
                    </span>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        onClick={cancelTransfer}
                        disabled={!isRunning}
                        className={`flex-1 sm:flex-none px-8 py-3 font-bold text-xs tracking-widest rounded-sm uppercase border border-outline-variant/30 transition-all duration-100 ${!isRunning ? 'opacity-30 cursor-not-allowed text-on-surface-variant' : 'text-error hover:bg-error/10 cursor-pointer active:scale-95'}`}
                    >
                        Cancel Pipeline
                    </button>
                    <button
                        onClick={startTransfer}
                        disabled={isRunning}
                        className={`flex-1 sm:flex-none px-12 py-3 font-black text-xs tracking-widest rounded-sm uppercase transition-all duration-100 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${isRunning ? 'bg-surface-container-highest text-on-surface-variant opacity-50 cursor-not-allowed' : 'kinetic-gradient text-on-primary hover:brightness-110 active:scale-95 cursor-pointer'}`}
                    >
                        {isRunning ? 'Running...' : isCompleted ? 'Restart Transfer' : 'Start Transfer'}
                    </button>
                </div>
            </footer>
        </>
    );
}
