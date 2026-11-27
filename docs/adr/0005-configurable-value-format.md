# The value format is configurable and defaults to an SVG data URL

Forms need a value that back ends can store, but different apps want different things. The `value-format` setting picks one of three:

- `svg`: `data:image/svg+xml;base64,…`. This is the default, and it matches the legacy app so existing data stays compatible.
- `png`: `data:image/png;base64,…`.
- `json`: signature data.

The value is `null` when the field is empty. The configured `background` (default `#fff`, or `transparent`, or any colour) is painted into `svg` and `png` exports, which fixes the legacy transparent export.

## Consequences

- An `svg` value that the field exported itself carries its signature data in the file, so it reloads stroke for stroke. A `png` value, or a foreign SVG, reloads as a base-layer image. See ADR-0006.
- The methods `toSVG()`, `toPNG()` and `toJSON()` work no matter which value format is configured.
