## 1.0.1 (2026-11-27)

### 🩹 Fixes

- **element:** keep strokes released while the mouse is still moving ([b65e790](https://github.com/DenysSlobodianyk1996/digital-signature-field/commit/b65e790))

### ❤️ Thank You

- Denys Slobodianyk @DenysSlobodianyk1996

# 1.0.0 (2026-11-27)

### 🚀 Features

- **angular:** wrapper spike, one package from Angular 17.2 to latest ([#6](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/6))
- **angular:** write values through the element's value setter, SignatureData value type ([#6](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/6))
- **angular:** complete wrapper: all inputs, outputs, methods, SSR safety ([#14](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/14))
- **demos:** React 19 and Vue 3 demo apps with Playwright smoke tests ([#15](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/15))
- **demos:** recipe sections in all four demo apps ([#16](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/16))
- **element:** skeleton workspace, draw a stroke and get an SVG value ([#5](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/5))
- **element:** pen colour/width, smoothing, pressure and proportional resize ([#8](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/8))
- **element:** undo, redo, clear and the default actions bar ([#7](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/7))
- **element:** load values as a base layer with SVG round-trip ([#9](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/9))
- **element:** configurable actions bar: tokens, positions, slots, labels ([#11](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/11))
- **element:** native form participation and validity ([#10](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/10))
- **element:** styling surface: custom properties, parts, styles, :state(drawing) ([#13](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/13))
- **element:** value formats and exports: svg, png, json, background ([#12](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/12))
- **element:** fire dsf-stroke-start and dsf-stroke-end for kept strokes ([#14](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/14))
- **site:** deploy the four demo apps to GitHub Pages ([#17](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/17))

### 🩹 Fixes

- **angular:** apply each setting input on its own, and restore the default when it goes back to undefined ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** measure pointer and size from the ink surface, not the area border box ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** size the blank export from the ink surface too ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** re-sync the PNG form value once a loaded image has decoded ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** drop strokes whose pointer is lost, and always pair dsf-stroke-start with dsf-stroke-end ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** keep every property set before the element was upgraded ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** update the form value when value-format, background, smoothing or pressure change ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** load the JSON text a json field submits ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))
- **element:** leave Ctrl+Z/Y to slotted controls, and ignore undefined labels ([#3](https://github.com/DenysSlobodianyk1996/digital-signature-field/pull/3))

### ❤️ Thank You

- Denys Slobodianyk @DenysSlobodianyk1996