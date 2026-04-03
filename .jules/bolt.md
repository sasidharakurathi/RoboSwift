## 2024-04-03 - High-Throughput IPC Optimization

**Learning:** Robocopy generates a massive amount of stdout lines per second during fast transfers (high-frequency logs). Emitting a single Tauri IPC message (`transfer-tick`) for every single log line quickly overwhelms the IPC bridge and causes excessive React DOM re-renders, severely degrading UI responsiveness and overall application performance. Standard single-event loops are an anti-pattern for this architecture.

**Action:** Whenever handling high-throughput event streams across the Rust/JS boundary in Tauri:
1.  **Batch on the backend:** Buffer the events in Rust (e.g., into a `Vec<TransferTick>`) and emit them at a fixed interval (e.g., every 50ms) or maximum batch size (e.g., 50 items).
2.  **Process efficiently on the frontend:** Update the React listener to accept an array of payloads. Accumulate log arrays locally and perform a *single* React state update per batch, minimizing DOM reflows. Use array operations like `unshift` or `.slice()` judiciously within the state setter.