# Legacy component analysis

The reference implementation lives outside this repo, in `code_reference/angular/sachal`, under `src/app/shared/form-components/signature-complex/`. This page records what it did and what went wrong, so that the new signature field keeps the good parts and fixes the bugs.

## What it was

| Part | Role |
| --- | --- |
| `shl-signature` | The drawing area. Implements `ControlValueAccessor`. |
| `shl-signature-complex` | A preview plus a "change signature" link that opens the pad in a Material dialog. Also implements `ControlValueAccessor`. |
| `signature-change-modal` | Hosts `shl-signature` with `[(ngModel)]` and a Save button. |

- **Stack:** Angular 9, Angular Material 9, `d3` for SVG manipulation, `hammerjs` for pan gestures.
- **Rendering:** inline `<svg>`. Each stroke is one `<polyline>`, with stroke colour `#000` and width `1.5` hard-coded.
- **Value:** `data:image/svg+xml;base64,…`, or `null`. It was re-emitted at the end of every stroke.
- **Actions:** undo and clear, as clickable `<div>` icons. There was no redo.
- **Styling:** emulated encapsulation with SCSS and BEM. Shadow DOM was commented out. Height was 300px on desktop and 200px on mobile. The UI was in Hebrew and right-to-left.

## Defects that become requirements

| # | Legacy defect | Requirement in the new design |
| --- | --- | --- |
| 1 | Undo removed the stroke from the screen but never updated the form value. | Every history change (stroke, undo, redo, clear) updates the value. |
| 2 | A tap emitted an SVG with no strokes, and that passed `Validators.required`. | Taps are discarded. An empty field's value is always `null`. |
| 3 | `writeValue` called `onChange`, so loading a value marked the form as changed. | Loading a value never emits a change and never marks the form as changed. |
| 4 | `writeValue` appended nodes without clearing first, so calling it twice duplicated the strokes. | Loading a value replaces the ink. The loaded value becomes the base layer. |
| 5 | There was no `viewBox` and coordinates were absolute pixels, so resizing cropped the drawing. A fixed dialog width of 604px was the workaround. | Strokes are stored in their own coordinate space and rendered with a `viewBox`, so the drawing scales with the drawing area. |
| 6 | Undo found strokes through a counter-based `#polyLine{n}` id, which broke on loaded values. | Strokes are kept in a model and the SVG is drawn from it. The DOM is never treated as the source of truth. |
| 7 | `onTouched` was never called and `setDisabledState` did nothing. | Touched, disabled and readonly are fully supported. |
| 8 | No smoothing; colour and width were hard-coded. | Smoothing is on, pressure-based width is optional, and pen colour and width are configurable. |
| 9 | Hammer managers were never destroyed. | No gesture library: native Pointer Events, with listeners removed when the element is disconnected. |
| 10 | The white background came from CSS only, so the exported SVG was transparent. | The `background` setting is written into the exported value. |
| 11 | `bypassSecurityTrustResourceUrl` was used on any value. | Loaded values are parsed, never injected as markup. |

## What we keep

- **SVG rendering:** it is resolution-independent and makes a small value.
- **Value as a data URL by default,** so existing back ends that store `data:image/svg+xml;base64,…` keep working.
- **Discarding very short strokes:** the legacy code dropped strokes of 2 points or fewer.
- **Support for RTL layouts.**
