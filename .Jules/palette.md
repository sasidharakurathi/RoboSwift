## 2026-04-03 - Adding Accessible Labels and Toggle States
**Learning:** Even custom-styled inputs and visual toggles require proper structural relationships (like `<label htmlFor>`) and ARIA attributes (like `aria-pressed`) to be fully usable by screen readers. A custom toggle without `aria-pressed` is just a button to a screen reader, masking its current state.
**Action:** Always map labels to inputs with `htmlFor` and use `aria-pressed` for toggle buttons to ensure accessibility.
