# @digital-signature-field/element

`<digital-signature-field>`: a hand-drawn signature as a real form field. A dependency-free custom element that works in plain HTML, React, Vue and any framework that renders custom elements. Angular users install [`@digital-signature-field/angular`](https://www.npmjs.com/package/@digital-signature-field/angular) instead.

- **A form field everywhere**: joins native `<form>`s through `ElementInternals` (`name`, `required`, `min-strokes`, reset, `FormData`).
- **Native Pointer Events**: mouse, touch and pen, with smoothing and optional pressure.
- **Configurable value**: SVG data URL (default), PNG data URL, or lossless JSON. `null` while empty.
- **Undo / redo / clear**, kept outside the drawing area: built-in buttons, your own buttons in slots, or an external toolbar.
- **Shadow DOM, still styleable**: CSS custom properties, `::part()`, injected style sheets.
- **Accessible**: keyboard shortcuts, ARIA labels and live status, RTL.

[Live demos](https://denysslobodianyk1996.github.io/digital-signature-field/) · [API reference](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/docs/api.md) · [Source](https://github.com/DenysSlobodianyk1996/digital-signature-field)

## Install

```bash
npm i @digital-signature-field/element
```

Importing the package registers the element:

```html
<form id="consent">
  <digital-signature-field name="signature" required></digital-signature-field>
  <button>Submit</button>
</form>

<script type="module">
  import '@digital-signature-field/element'; // registers <digital-signature-field>

  const form = document.querySelector('#consent');
  const sig = form.querySelector('digital-signature-field');

  sig.addEventListener('change', (e) => console.log(e.detail.value));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;            // `required` → blocked while empty
    const signature = new FormData(form).get('signature'); // "data:image/svg+xml;base64,…"
  });
</script>
```

No bundler? Load it from a CDN: `<script type="module" src="https://cdn.jsdelivr.net/npm/@digital-signature-field/element/+esm"></script>`.

## React 19 and Vue 3

Use the element directly: bind with a `ref` (React) or `:value` + `@change` (Vue), and pass objects and arrays as properties. JSX types: add `"types": ["@digital-signature-field/element/jsx-react"]` to `tsconfig.json`. Complete recipes are in the [repository README](https://github.com/DenysSlobodianyk1996/digital-signature-field#react-19) and the [React](https://denysslobodianyk1996.github.io/digital-signature-field/react/) and [Vue](https://denysslobodianyk1996.github.io/digital-signature-field/vue/) demos.

## Customise

```css
digital-signature-field {
  --dsf-height: 240px;
  --dsf-area-bg: #fffdf5;
  --dsf-radius: 12px;
}
digital-signature-field::part(action-clear) { color: crimson; }
```

| Want | Set |
| --- | --- |
| Which buttons | `actions="undo redo clear"` · `"none"` for headless |
| Where | `actions-position="bottom\|top\|start\|end"` |
| Value type | `value-format="svg\|png\|json"` |
| Export background | `background="#fff"` · `"transparent"` |
| Pen | `pen-color`, `pen-width`, `pressure`, `smoothing` |
| Validity | `required`, `min-strokes`, `min-stroke-length` |
| Translations | `labels` property |

Methods: `undo()`, `redo()`, `clear()`, `toSVG()`, `toPNG({ scale? })`, `toJSON()`. Events: `change` (`{ value }`), `dsf-history-change`, `dsf-stroke-start`, `dsf-stroke-end`. Everything else is in the [API reference](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/docs/api.md).

## Versioning

`@digital-signature-field/element` and `@digital-signature-field/angular` are released together and always share one version. Releases are published from GitHub Actions with npm provenance. Changes: [CHANGELOG](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/CHANGELOG.md).

## License

MIT
