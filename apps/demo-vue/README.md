# demo-vue

Vue 3 demo of `<digital-signature-field>`. It uses the custom element directly (no wrapper) and consumes the element's built package, like an app installing it from npm would.

Live: <https://denysslobodianyk1996.github.io/digital-signature-field/vue/>

## Run it

From the repository root:

```bash
pnpm install
pnpm nx serve demo-vue     # dev server (builds the element first)
pnpm nx preview demo-vue   # production build, served by vite preview
pnpm nx e2e demo-vue       # Playwright smoke tests against the production build (port 4329)
```

`DSF_DEMO_BASE=/some/path/` builds and serves it under a sub-path (GitHub Pages uses `/digital-signature-field/vue/`).

Setup worth copying: `isCustomElement` in [`vite.config.ts`](vite.config.ts) tells Vue the tag is a custom element, and [`src/digital-signature-field.d.ts`](src/digital-signature-field.d.ts) declares it in `GlobalComponents` so props and `$event` are type-checked.

## What each section shows

Every section shows the current value as an `<img>` preview (values are data URLs) and, under **Raw value**, the value itself.

| Section | Variant | What it demonstrates | Source |
| --- | --- | --- | --- |
| **Default** | [1](../../docs/variants/01-inline-bottom-bar.md) | The README recipe, unchanged: `:value` + `@change` two-way binding inside a native `<form>` with `required`, `labels` passed with `.prop`. Submitting shows the submitted `FormData` value. | [`App.vue`](src/App.vue) |
| **Headless with the app's own toolbar** | [4](../../docs/variants/04-headless-external-toolbar.md) | `actions="none"`; the app's Undo / Redo / Start over buttons call `undo()`, `redo()`, `clear()` through a template ref and are enabled from `@dsf-history-change`. | [`HeadlessSection.vue`](src/recipes/HeadlessSection.vue) |
| **Custom styles** | — | Custom properties and `::part()` from the app stylesheet (`.fancy-signature` in [`styles.css`](src/styles.css)), plus a sheet passed with `:styles.prop`. | [`DemoPage.vue`](src/recipes/DemoPage.vue) |
| **Preview + dialog** | [5](../../docs/variants/05-preview-and-dialog.md) | The form shows an `<img>` preview; a native `<dialog>` edits a `draft` copy. **Save** copies the draft into the form state, **Cancel** discards it. | [`DialogSection.vue`](src/recipes/DialogSection.vue) |
| **Actions bar above, with pen options** | [2](../../docs/variants/02-top-bar-pen-options.md) | `actions="color width undo redo clear"`, `actions-position="top"`, `:penColors.prop` and `pressure`. | [`DemoPage.vue`](src/recipes/DemoPage.vue) |
| **Side rail, right to left** | [3](../../docs/variants/03-side-rail.md) | `actions-position="end"` with `dir="rtl"` (the rail moves to the left) and Hebrew `:labels.prop`. | [`DemoPage.vue`](src/recipes/DemoPage.vue) |

## Tests

- [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts): draw, undo, draw and submit in the Default section.
- [`e2e/recipes.spec.ts`](e2e/recipes.spec.ts): the headless toolbar, dialog Save / Cancel, value previews, custom styles, and the top bar and RTL rail layouts.
- [`e2e/readme.spec.ts`](e2e/readme.spec.ts): fails if the root README's Vue recipe drifts from `App.vue`, the `GlobalComponents` declaration or the `isCustomElement` setting.
