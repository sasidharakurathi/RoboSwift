## 2024-05-18 - Missing Content Security Policy
**Vulnerability:** The application was running with `csp: null` in its Tauri configuration, completely disabling the Content Security Policy.
**Learning:** A missing CSP in a desktop application utilizing web tech leaves it exposed to XSS attacks, which could potentially give an attacker access to local filesystem resources via the backend bridge.
**Prevention:** Always define a strict `default-src 'self'` baseline CSP in Tauri and incrementally add required endpoints (like dev server WS and external fonts) instead of disabling it entirely.
