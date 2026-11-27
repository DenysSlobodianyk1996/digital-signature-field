# demo-react

React 19 demo of `<digital-signature-field>`. It uses the custom element directly (no wrapper) and consumes the element's built package, like an app installing it from npm would.

Live: <https://denysslobodianyk1996.github.io/digital-signature-field/react/>

## Run it

From the repository root:

```bash
pnpm install
pnpm nx serve demo-react     # dev server (builds the element first)
pnpm nx preview demo-react   # production build, served by vite preview
pnpm nx e2e demo-react       # Playwright smoke tests against the production build (port 4319)
```

`DSF_DEMO_BASE=/some/path/` builds and serves it under a sub-path (GitHub Pages uses `/digital-signature-field/react/`).

## What each section shows

Every section shows the current value as an `<img>` preview (values are data URLs) and, under **Raw value**, the value itself.

| Section | Variant | What it demonstrates | Source |
| --- | --- | --- | --- |
| **Default** | [1](../../docs/variants/01-inline-bottom-bar.md) | The README recipe, unchanged: a `SignatureInput` wrapper listening to `change` through a ref, inside a native `<form>` with `required`. Submitting shows the submitted `FormData` value. | [`App.tsx`](src/App.tsx), [`SignatureInput.tsx`](src/SignatureInput.tsx) |
| **Headless with the app's own toolbar** | [4](../../docs/variants/04-headless-external-toolbar.md) | `actions="none"`; the app's Undo / Redo / Start over buttons call `undo()`, `redo()`, `clear()` and are enabled from `dsf-history-change`. | [`HeadlessSection.tsx`](src/recipes/HeadlessSection.tsx) |
| **Custom styles** | — | Custom properties and `::part()` from the app stylesheet (`.fancy-signature` in [`styles.css`](src/styles.css)), plus a sheet passed through the `styles` property. | [`Demo.tsx`](src/recipes/Demo.tsx) |
| **Preview + dialog** | [5](../../docs/variants/05-preview-and-dialog.md) | The form shows an `<img>` preview; a native `<dialog>` edits a copy. **Save** copies the field's value into the form state, **Cancel** discards it. | [`DialogSection.tsx`](src/recipes/DialogSection.tsx) |
| **Actions bar above, with pen options** | [2](../../docs/variants/02-top-bar-pen-options.md) | `actions="color width undo redo clear"`, `actionsPosition="top"`, `penColors` (an array prop, set as a property by React 19) and `pressure`. | [`Demo.tsx`](src/recipes/Demo.tsx) |
| **Side rail, right to left** | [3](../../docs/variants/03-side-rail.md) | `actionsPosition="end"` with `dir="rtl"` (the rail moves to the left) and Hebrew `labels`. | [`Demo.tsx`](src/recipes/Demo.tsx) |

`useElementEvent` ([`recipes/useElementEvent.ts`](src/recipes/useElementEvent.ts)) is the small hook the sections use to listen to the element's `change` and `dsf-history-change` events, since React has no `on…` props for custom events.

## Tests

- [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts): draw, undo, draw and submit in the Default section.
- [`e2e/recipes.spec.ts`](e2e/recipes.spec.ts): the headless toolbar, dialog Save / Cancel, value previews, custom styles, and the top bar and RTL rail layouts.
- [`e2e/readme.spec.ts`](e2e/readme.spec.ts): fails if the root README's React recipe drifts from `App.tsx` and `SignatureInput.tsx`.
