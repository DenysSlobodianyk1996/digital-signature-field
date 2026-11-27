# demo-html

Plain HTML demo of `<digital-signature-field>`: one static [`index.html`](src/index.html), one ES module ([`main.js`](src/main.js)) and a stylesheet. No framework, no bundler, no compile step.

Live: <https://denysslobodianyk1996.github.io/digital-signature-field/html/>

## Run it

From the repository root:

```bash
pnpm install
pnpm nx serve demo-html   # builds, then serves dist/ at http://localhost:4339
pnpm nx e2e demo-html     # Playwright smoke tests against dist/ (port 4339)
```

`nx build demo-html` builds the element package first, then copies `src/` and `packages/element/dist` (as `dist/element/`) into `apps/demo-html/dist`. `main.js` imports `./element/index.js`, and the page loads everything by relative URL, so `dist/` works from any static server under any path. `DSF_DEMO_BASE=/some/path/` serves and tests it under a sub-path; GitHub Pages uses `/digital-signature-field/html/`.

## On a real page

Load the element from npm through a CDN instead of the local build, with one line:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@digital-signature-field/element@1/+esm"></script>
```

or, inside your own module, `import 'https://cdn.jsdelivr.net/npm/@digital-signature-field/element@1/+esm';`. With a bundler, `npm i @digital-signature-field/element` and `import '@digital-signature-field/element';` (see the root [README](../../README.md#vanilla-js)).

## What each section shows

Every section shows the current value as an `<img>` preview (values are data URLs) and, under **Raw value**, the value itself. All code is in [`main.js`](src/main.js).

| Section | Variant | What it demonstrates |
| --- | --- | --- |
| **Default** | [1](../../docs/variants/01-inline-bottom-bar.md) | The README's Vanilla JS recipe: a native `<form>` with `required`; `change` updates the preview, and Submit reads the value with `FormData` (`reportValidity()` blocks an empty field). `labels` is set as a property. |
| **Headless with the page's own toolbar** | [4](../../docs/variants/04-headless-external-toolbar.md) | `actions="none"`; Undo / Redo / Start over buttons call `undo()`, `redo()`, `clear()` and are enabled from `dsf-history-change`. |
| **Custom styles** | — | Custom properties and `::part()` from the page stylesheet (`.fancy-signature` in [`styles.css`](src/styles.css)), plus a sheet passed through the `styles` property. |
| **Preview + dialog** | [5](../../docs/variants/05-preview-and-dialog.md) | A native `<dialog>` edits a copy: opening it sets the field's `value` to the saved one, **Save** copies the field's value back, **Cancel** discards it. |
| **Actions bar above, with pen options** | [2](../../docs/variants/02-top-bar-pen-options.md) | `actions="color width undo redo clear"`, `actions-position="top"`, `pressure`, and `penColors` (a property only). |
| **Side rail, right to left** | [3](../../docs/variants/03-side-rail.md) | `actions-position="end"` with `dir="rtl"` (the rail moves to the left) and Hebrew `labels`. |

## Tests

- [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts): draw, undo, draw and submit in the Default section; the headless toolbar; dialog Save / Cancel; value previews; custom styles; the top bar and RTL rail layouts.
