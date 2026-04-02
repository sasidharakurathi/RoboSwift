<p align="center">
  <img src="public/favicon.svg" width="80" alt="RoboSwift Logo" />
</p>

<h1 align="center">RoboSwift</h1>

<p align="center">
  <strong>A high-performance desktop GUI for the Windows <code>robocopy</code> engine.</strong><br/>
  Built with Tauri 2 · React 19 · Rust · Tailwind CSS 4
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows" />
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-ffc131?style=flat-square&logo=tauri" />
</p>

---

## ✦ Overview

RoboSwift wraps the legendary Windows `robocopy` command-line utility in a modern, real-time desktop interface. Instead of memorizing cryptic flags and parsing terminal output, you get:

- **Visual flag selection** - toggle `/MIR`, `/MT:16`, `/Z`, `/SEC`, and more with a single click, complete with explanatory tooltips.
- **Live telemetry HUD** - watch network throughput, processed file counts, and overall progress update in real time as the transfer runs.
- **Real-time log stream** - a scrollable, timestamped feed of every file `robocopy` touches, parsed and formatted from raw stdout.
- **Generated command preview** - the exact `robocopy` command string is displayed live so you always know what's being executed.
- **Cancel anytime** - gracefully terminate a running transfer via PID-level process management from the Rust backend.

## ✦ Screenshots

> _Coming soon_

## ✦ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Tauri 2 Shell                        │
│  ┌────────────────────────┐  ┌────────────────────────┐  │
│  │   React 19 Frontend    │  │    Rust Backend        │  │
│  │                        │  │                        │  │
│  │  • Source/Dest pickers │  │  • Spawns robocopy     │  │
│  │  • Flag toggle grid    │◄─┤  • Parses stdout lines │  │
│  │  • Progress HUD        │  │  • Regex: % + speed    │  │
│  │  • Live log stream     │  │  • Emits transfer-tick │  │
│  │  • Command preview     │  │  • PID-based cancel    │  │
│  └────────────────────────┘  └────────────────────────┘  │
│           Tauri IPC (invoke / listen)                    │
└──────────────────────────────────────────────────────────┘
```

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Vite 8 | UI rendering, state, event listeners |
| **Backend** | Rust, Tauri 2, `regex` crate | Process management, stdout parsing, IPC events |
| **Bridge** | Tauri Commands + Events | `start_transfer`, `cancel_transfer`, `transfer-tick`, `transfer-complete` |
| **Engine** | Windows `robocopy.exe` | The actual file transfer utility |

## ✦ Tech Stack

- **[Tauri 2](https://v2.tauri.app/)** - Lightweight Rust-powered desktop shell (~10 MB bundle)
- **[React 19](https://react.dev/)** - Declarative UI with hooks and event-driven state
- **[TypeScript 5.9](https://www.typescriptlang.org/)** - Type-safe frontend code
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS with a custom Material 3 dark token palette
- **[Vite 8](https://vite.dev/)** - Lightning-fast HMR dev server and bundler
- **[Rust](https://www.rust-lang.org/)** - Backend process management, stdout parsing with `regex`, thread-safe state via `Mutex`

## ✦ Supported Robocopy Flags

| Flag | Description |
|------|-------------|
| `/MIR` | **Mirror mode** - copies all subdirectories and deletes destination files no longer in source |
| `/MT:16` | **Multi-threaded** - 16 concurrent copy threads for maximum throughput |
| `/Z` | **Restartable mode** - resumes partially copied files after network interruption |
| `/XO` | **Exclude older** - skips source files older than existing destination files |
| `/S` | **Subdirectories** - copies all subdirectories, excluding empty ones |
| `/SEC` | **Copy security** - preserves NTFS permissions, ownership, and ACLs |
| `/W:5` | **Wait time** - 5-second delay between retries on failure |
| `/ETA` | **Estimated time** - displays approximate remaining time for the active file |

Additional hardcoded flags: `/V` (verbose), `/TS` (timestamps), `/FP` (full paths), `/NJH /NJS /NDL` (clean output parsing), `/LOG:robolog.txt`.

## ✦ Getting Started

### Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| **Node.js** | 18+ |
| **Rust** | 1.77.2+ |
| **Windows** | 10 / 11 (required for `robocopy`) |
| **Tauri CLI** | Installed via `npm` (see below) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sasidharakurathi/RoboSwift.git
cd RoboSwift

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (launches Vite + Tauri together)
npm run tauri dev

# 4. Build a production binary
npm run tauri build
```

The production installer will be output to `src-tauri/target/release/bundle/`.

## ✦ Project Structure

```
RoboSwift/
├── public/                      # Static assets (favicon, icons SVG)
├── src/                         # React frontend
│   ├── components/
│   │   └── Tooltip.tsx          # Reusable tooltip component
│   ├── App.tsx                  # Main application UI & logic
│   ├── App.css                  # Component-specific styles
│   ├── index.css                # Tailwind theme tokens & global styles
│   └── main.tsx                 # React entry point
├── src-tauri/                   # Rust / Tauri backend
│   ├── src/
│   │   ├── lib.rs               # Core logic: start_transfer, cancel_transfer
│   │   └── main.rs              # Binary entry point
│   ├── capabilities/            # Tauri permission capabilities
│   ├── icons/                   # App icons for all platforms
│   ├── tauri.conf.json          # Tauri window, bundle & build config
│   └── Cargo.toml               # Rust dependencies
├── stitch_ui.html               # Static design reference (Stitch export)
├── index.html                   # HTML shell for Vite
├── vite.config.ts               # Vite + React + Tailwind plugin config
├── package.json                 # Node dependencies & scripts
└── tsconfig.json                # TypeScript configuration
```

## ✦ Design System

RoboSwift uses a custom **"Kinetic Void"** dark design system inspired by Material 3 tokens:

- **Typography** - *Space Grotesk* (headlines), *Inter* (body/labels)
- **Color palette** - Deep blacks (`#0e0e0e`) with electric blue accents (`#85adff`, `#0070eb`)
- **Aesthetic** - Industrial, mission-control UI with monospace labels, uppercase tracking, and minimal corner radii
- **Icons** - Google Material Symbols (Outlined, variable weight)

## ✦ IPC Commands

| Command | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `start_transfer` | Frontend → Rust | `{ source, destination, flags }` | Spawns `robocopy` process |
| `cancel_transfer` | Frontend → Rust | - | Kills active process via PID |
| `transfer-tick` | Rust → Frontend | `{ current_file, progress, speed, log_line }` | Emitted per stdout line |
| `transfer-complete` | Rust → Frontend | - | Emitted when `robocopy` exits |

## ✦ Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run ESLint across the project |
| `npm run tauri dev` | Full stack dev mode (Vite + Tauri) |
| `npm run tauri build` | Compile production desktop binary |

## ✦ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## ✦ Author

**Sasidhar Akurathi**

---

<p align="center">
  <sub>Built with ⚡ Tauri, 🦀 Rust, and ⚛️ React</sub>
</p>
