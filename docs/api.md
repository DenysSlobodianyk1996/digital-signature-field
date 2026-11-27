# API reference (draft)

> **Status:** design draft. Nothing is implemented yet. Names may still change before `1.0.0`.

## `<digital-signature-field>` — `@digital-signature-field/element`

### Attributes / properties

| Attribute | Property | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `name` | `name` | `string` | — | Form field name. Used by the native `<form>` through `ElementInternals`. |
| `required` | `required` | `boolean` | `false` | Invalid (`valueMissing`) while the field is empty. |
| `disabled` | `disabled` | `boolean` | `false` | Blocks drawing and all actions. Excluded from form submission. |
| `readonly` | `readOnly` | `boolean` | `false` | Shows the ink and blocks drawing and actions. Still submitted. |
| — | `value` | `string \| SignatureData \| null` | `null` | Setting it loads a base layer and **does not** emit `change`. Setting the value the field already has does nothing, so the history is kept. |
| `value-format` | `valueFormat` | `'svg' \| 'png' \| 'json'` | `'svg'` | Format of `value` and of the `change` detail. |
| `background` | `background` | CSS colour \| `'transparent'` | `'#fff'` | Painted into exported `svg` and `png` values. |
| `pen-color` | `penColor` | CSS colour | `'#000'` | Applies to new strokes. |
| `pen-width` | `penWidth` | `number` (px) | `2` | Base stroke width. |
| `pressure` | `pressure` | `boolean` | `false` | Varies the width with pen pressure, when the device reports it. |
| `smoothing` | `smoothing` | `number` 0–1 | `0.5` | `0` draws raw polylines. |
| `min-strokes` | `minStrokes` | `number` | `1` | Fewer strokes than this makes the field invalid (`tooShort`). |
| `min-stroke-length` | `minStrokeLength` | `number` (px) | `8` | Shorter strokes are treated as taps and discarded. |
| `history-limit` | `historyLimit` | `number` | `50` | Maximum number of undoable entries. |
| `actions` | `actions` | space-separated tokens | `'undo clear'` | Tokens: `undo`, `redo`, `clear`, `color`, `width`, or `none`. |
| `actions-position` | `actionsPosition` | `'bottom' \| 'top' \| 'start' \| 'end'` | `'bottom'` | `start` and `end` follow `dir`. |
| — | `labels` | `Partial<Labels>` | English | `{ undo, redo, clear, color, width, thin, medium, thick, drawingArea, emptyStatus, signedStatus }`. `color` and `width` name the swatch and width groups; `thin`/`medium`/`thick` name the three widths; the status texts are announced by the live region (`status` part). Unset keys stay English. |
| — | `penColors` | `string[]` | `['#000', '#1a3fbf']` | Swatches shown by the `color` action. |
| — | `styles` | `string \| CSSStyleSheet \| Array<string \| CSSStyleSheet>` | — | Extra sheets added through `adoptedStyleSheets` (ADR-0007). |

### Read-only state

`empty: boolean` · `canUndo: boolean` · `canRedo: boolean` · `validity` · `validationMessage` · `willValidate` · `form`

### Methods

| Method | Effect |
| --- | --- |
| `undo()` / `redo()` | Moves through history. Emits `change` and `dsf-history-change`. |
| `clear()` | Removes all ink, base layer included, as one undoable entry (ADR-0006). |
| `toSVG(): string` | SVG data URL, whatever `valueFormat` is set to. An empty field gives the background only, at the drawing area's size. |
| `toPNG(opts?: { scale?: number }): Promise<string>` | PNG data URL, `scale` (default `1`) times the drawing-area size. A `png` value is rendered at scale 1. |
| `toJSON(): SignatureData \| null` | Lossless signature data; `null` while the field is empty. |
| `focus()` | Focuses the drawing area. |
| `checkValidity()` / `reportValidity()` | As on native inputs. `reportValidity()` shows the browser's validation message on the drawing area. |

### Events

| Event | Detail | When |
| --- | --- | --- |
| `change` | `{ value }` | After each stroke ends, and after undo, redo and clear. Never fired when a value is loaded. |
| `dsf-history-change` | `{ canUndo, canRedo, empty }` | Whenever any of the three changes. Use it to drive an external toolbar. |
| `dsf-stroke-start` / `dsf-stroke-end` | `{ strokeCount }` | Pen down and pen up, for strokes that are kept. |
| `blur` | — | Focus left the field. Wrappers map this to "touched". |

### Type exports

`DigitalSignatureFieldElement` (the element class), `SignatureData`, `Labels`, `ValueFormat`, `Styles`. The subpath `@digital-signature-field/element/jsx-react` adds the tag to React's `JSX.IntrinsicElements`. Vue users declare it in `GlobalComponents` (recipe in the demo).

### `SignatureData`

```ts
interface SignatureData {
  version: 1;
  width: number;          // size of the drawing area the strokes were drawn in
  height: number;
  strokes: Array<{
    color: string;
    width: number;
    points: Array<{ x: number; y: number; pressure: number; t: number }>;
  }>;
  image?: string;         // a loaded PNG or foreign-SVG base layer (data URL), drawn under the strokes
}
```

A PNG data URL, or an SVG the field did not export, loads as a base-layer **image** at its own size; `toJSON()` then carries it in `image`. Loaded values are parsed, never injected as markup: an SVG image is shown as a picture, so scripts in it never run. Exports use the pen and `background` settings only, never computed page CSS.

### Styling

**Custom properties:** `--dsf-height` (default `200px`), `--dsf-border`, `--dsf-radius`, `--dsf-area-bg`, `--dsf-guide-color` (the baseline guide), `--dsf-gap`, `--dsf-button-size`, `--dsf-button-color`, `--dsf-button-bg`, `--dsf-button-hover-bg`, `--dsf-focus-ring`, `--dsf-invalid-color`.

**Parts:** `root`, `area`, `guide`, `ink`, `actions`, `action` (every button), `action-undo`, `action-redo`, `action-clear`, `action-color`, `action-width`, `status`.

**Slots:** `actions` (replaces the bar's content), `actions-start`, `actions-end`, `placeholder` (shown in the drawing area while the field is empty).

**State selectors:** `:state(empty)`, `:state(invalid)`, `:state(drawing)`, plus `[disabled]` and `[readonly]` on the host. `:state(invalid)` is only set once the user has interacted with the field (a stroke, undo, redo, clear, or focus leaving it) or a submit was attempted, like `:user-invalid`; a form reset hides it again. `:disabled` also matches inside a disabled `<fieldset>`.

## `@digital-signature-field/angular`

| Export | Kind | Purpose |
| --- | --- | --- |
| `DsfSignature` | standalone component `<dsf-signature>` | Wraps the element. Has the `FormValueControl` shape (ADR-0003). |
| `DsfSignatureCva` | standalone directive `[dsfCva]` | CVA mode, for Angular 17–21 forms. |

`<dsf-signature>` passes through every element property as an `input()` with the same camelCase name. Its form contract:

```ts
value    = model<string | SignatureData | null>(null);
disabled = input(false);  readonly = input(false);
invalid  = input(false);  required = input(false);  touched = input(false);
touch    = output<void>();
```

The element's events are re-exposed as outputs: `historyChange` (`{ canUndo, canRedo, empty }`), `strokeStart` and `strokeEnd`. Value changes come through the `value` model (`[(value)]`).

Imperative access is through `viewChild(DsfSignature)`: `.undo()`, `.redo()`, `.clear()`, `.toPNG()`, …
