# demo-angular

Latest-Angular demo of the `<dsf-signature>` wrapper (`@digital-signature-field/angular`). Zoneless and `OnPush`; forms bind the component directly, without the `dsfCva` directive.

Live: <https://denysslobodianyk1996.github.io/digital-signature-field/angular/>

## Run it

From the repository root:

```bash
pnpm install
pnpm nx build angular            # the wrapper; the demo links its dist folder
pnpm nx serve demo-angular       # ng serve
pnpm nx test demo-angular        # component tests (Vitest browser mode)
pnpm nx e2e demo-angular         # Playwright smoke tests against the production build (port 4310)
```

## What each section shows

Every field shows its current value as an `<img>` preview (values are data URLs) and, under **Raw value**, the value itself ([`value-view.ts`](src/app/value-view.ts)).

| Section | Variant | What it demonstrates | Source |
| --- | --- | --- | --- |
| **Default** | [1](../../docs/variants/01-inline-bottom-bar.md) | The same required field bound side by side with **signal forms** (`[formField]`) and **reactive forms** (`formControlName`), with each control's validity. | [`app.ts`](src/app/app.ts) |
| **Headless with the app's own toolbar** | [4](../../docs/variants/04-headless-external-toolbar.md) | `actions="none"`; the app's Undo / Redo / Start over buttons call `undo()`, `redo()`, `clear()` on the component (`#sig`) and are enabled from `(historyChange)`. | [`headless-section.ts`](src/app/headless-section.ts) |
| **Custom styles** | — | Custom properties on the host and `::part()` on the element inside it (`.fancy-signature` in [`styles.css`](src/styles.css)), plus a sheet passed through the `[styles]` input. | [`app.ts`](src/app/app.ts) |
| **Preview + dialog** | [5](../../docs/variants/05-preview-and-dialog.md) | The form shows an `<img>` preview; a native `<dialog>` edits a `draft` copy through `[(value)]`. **Save** copies the draft into the form state, **Cancel** discards it. With Angular Material, the same pattern uses `MatDialog`. | [`dialog-section.ts`](src/app/dialog-section.ts) |
| **Actions bar above, with pen options** | [2](../../docs/variants/02-top-bar-pen-options.md) | `actions="color width undo redo clear"`, `actionsPosition="top"`, `[penColors]` and `pressure`. | [`app.ts`](src/app/app.ts) |
| **Side rail, right to left** | [3](../../docs/variants/03-side-rail.md) | `actionsPosition="end"` with `dir="rtl"` on the host (the rail moves to the left) and Hebrew `[labels]`. | [`app.ts`](src/app/app.ts) |

## Tests

- [`src/*.spec.ts`](src): the wrapper's inputs, outputs, methods and form bindings.
- [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts): drawing sets the signal-forms and reactive-forms values.
- [`e2e/recipes.spec.ts`](e2e/recipes.spec.ts): the headless toolbar, dialog Save / Cancel, value previews, custom styles, and the top bar and RTL rail layouts.
