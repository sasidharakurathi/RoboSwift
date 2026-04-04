## 2024-04-04 - Missing Content Security Policy
**Vulnerability:** The Tauri application had a null Content Security Policy (CSP) in `tauri.conf.json`.
**Learning:** A missing CSP allows potential Cross-Site Scripting (XSS) vulnerabilities, as the application would freely execute unauthorized inline scripts or load resources from malicious domains. In Tauri apps, the UI layer is a web view, and thus susceptible to standard web vulnerabilities if not properly locked down.
**Prevention:** Always define a strict `csp` string in `tauri.conf.json` that limits sources to `self`, explicitly allows required CDNs (e.g., Google Fonts), and allows Vite dev server connections via `ipc:`, `ws://`, and `http://`.
