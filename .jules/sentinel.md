## 2024-04-03 - [Missing Content Security Policy (CSP)]
**Vulnerability:** The application was missing a strict Content Security Policy (CSP) in `tauri.conf.json` (`"csp": null`), allowing any remote scripts or resources to be loaded if an XSS vulnerability were to occur.
**Learning:** By default, Tauri applications might have an insecure CSP configuration if not explicitly set. Even for desktop applications, a strict CSP is essential to prevent privilege escalation via XSS.
**Prevention:** Always verify that `tauri.conf.json` contains a secure CSP string that strictly whitelists necessary origins and prevents inline script execution (e.g., omitting `'unsafe-inline'` for scripts).
