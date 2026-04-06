## 2024-04-06 - High-Frequency Tauri IPC Frontend Batching
**Learning:** High-frequency Tauri IPC events (like thousands of transfer ticks per second) can completely block the React main thread if each event immediately updates component state, causing significant UI lag.
**Action:** Use a `useRef` array as a buffer in the React frontend to queue incoming events, and process/drain them periodically using `setInterval` (e.g., every 100ms) to update the component state in a single batch, drastically reducing re-renders.
