# Shadow DOM with three styling layers: custom properties, parts, injected sheets

The element uses Shadow DOM, so host-page CSS cannot break it by accident. It can still be customised on purpose in three layers:

1. **CSS custom properties** (`--dsf-*`) for theming. This is part of the stable contract.
2. **`::part()`** names on the structural pieces. This is also part of the stable contract.
3. **A `styles` property** that takes a CSS string, a `CSSStyleSheet`, or an array of them, applied through `adoptedStyleSheets`. This is the escape hatch for full overrides. Selectors inside the shadow root are not covered by semver.

## Consequences

- Custom property names and part names are public API. Renaming one is a breaking change.
- Exported images use the pen and `background` values, never computed CSS, so the export looks the same regardless of the page's theme.
