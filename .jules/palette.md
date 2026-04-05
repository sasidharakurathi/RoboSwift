## 2024-05-24 - Accessibility improvements in Roboswift App
**Learning:** Found an accessibility issue pattern specific to this app's components: Inputs in `src/App.tsx` did not have linked labels, and the execution flag toggle buttons lacked an `aria-pressed` state to indicate whether they were selected.
**Action:** Always link `<label>` with `htmlFor` to `<input>` with `id` correctly. For visual toggle buttons (like the flags), use the `aria-pressed` attribute to maintain structural relationships and screen reader accessibility so their active state is properly communicated.
