# demo-angular-17

Angular 17 demo of the `<dsf-signature>` wrapper (`@digital-signature-field/angular`), the oldest Angular the wrapper supports. Angular 17–21 bind forms through the opt-in **CVA mode** (`dsfCva`).

Live: <https://denysslobodianyk1996.github.io/digital-signature-field/angular-17/>

## Run it

From the repository root:

```bash
pnpm install
pnpm nx build angular              # the wrapper; the demo links its dist folder
pnpm nx serve demo-angular-17      # ng serve
pnpm nx test demo-angular-17       # component tests (Karma + Jasmine on Playwright's Chromium)
pnpm nx e2e demo-angular-17        # Playwright smoke tests against the production build (port 4317)
```

## What each section shows

Every field shows its current value as an `<img>` preview (values are data URLs) and, under **Raw value**, the value itself ([`value-view.component.ts`](src/app/value-view.component.ts)).

| Section | Variant | What it demonstrates | Source |
| --- | --- | --- | --- |
| **Default** | [1](../../docs/variants/01-inline-bottom-bar.md) | A required reactive form control bound in **CVA mode**: `<dsf-signature dsfCva formControlName="signature" />`, with the control's validity. | [`app.component.ts`](src/app/app.component.ts) |
| **Headless with the app's own toolbar** | [4](../../docs/variants/04-headless-external-toolbar.md) | `actions="none"`; the app's Undo / Redo / Start over buttons call `undo()`, `redo()`, `clear()` on the component (`#sig`) and are enabled from `(historyChange)`. | [`headless-section.component.ts`](src/app/headless-section.component.ts) |
| **Custom styles** | — | Custom properties on the host and `::part()` on the element inside it (`.fancy-signature` in [`styles.css`](src/styles.css)), plus a sheet passed through the `[styles]` input. | [`app.component.ts`](src/app/app.component.ts) |
| **Preview + dialog** | [5](../../docs/variants/05-preview-and-dialog.md) | The form shows an `<img>` preview; a native `<dialog>` edits a `draft` copy through `[(value)]`. **Save** copies the draft into the form state, **Cancel** discards it. | [`dialog-section.component.ts`](src/app/dialog-section.component.ts) |
| **Actions bar above, with pen options** | [2](../../docs/variants/02-top-bar-pen-options.md) | `actions="color width undo redo clear"`, `actionsPosition="top"`, `[penColors]` and `pressure`. | [`app.component.ts`](src/app/app.component.ts) |
| **Side rail, right to left** | [3](../../docs/variants/03-side-rail.md) | `actionsPosition="end"` with `dir="rtl"` on the host (the rail moves to the left) and Hebrew `[labels]`. | [`app.component.ts`](src/app/app.component.ts) |

The production build warns that two `::part()` rules are skipped: that is Angular 17's critical-CSS inliner, which cannot parse pseudo-elements. The rules still ship in the full stylesheet (the smoke tests check they apply).

## Tests

- [`src/*.spec.ts`](src): the wrapper in CVA mode.
- [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts): drawing sets the reactive-forms value.
- [`e2e/recipes.spec.ts`](e2e/recipes.spec.ts): the headless toolbar, dialog Save / Cancel, value previews, custom styles, and the top bar and RTL rail layouts.
