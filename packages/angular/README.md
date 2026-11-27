# @digital-signature-field/angular

`<dsf-signature>`: an Angular wrapper for the [`<digital-signature-field>`](https://www.npmjs.com/package/@digital-signature-field/element) custom element, a hand-drawn signature that works as a form field. One package supports Angular 17.2 and later.

[Live demos](https://denysslobodianyk1996.github.io/digital-signature-field/) ([Angular](https://denysslobodianyk1996.github.io/digital-signature-field/angular/), [Angular 17](https://denysslobodianyk1996.github.io/digital-signature-field/angular-17/)) · [API reference](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/docs/api.md) · [Source](https://github.com/DenysSlobodianyk1996/digital-signature-field)

## Install

```bash
npm i @digital-signature-field/angular
```

This also installs `@digital-signature-field/element`, always at the same version. Peer dependencies: `@angular/core` and `@angular/forms` `>=17.2`.

Import the standalone `DsfSignature` component. The wrapper loads and registers the element itself, in the browser, so you don't import the element package.

## Forms

On Angular 22 and later, `<dsf-signature>` works with all three forms styles with no extra directive. The control's value is the field's value: an SVG data URL by default (see `valueFormat`), or `null` while the field is empty.

### Signal forms (`[formField]`)

```ts
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { DsfSignature } from '@digital-signature-field/angular';

@Component({
  selector: 'app-consent',
  imports: [DsfSignature, FormField],
  template: `<dsf-signature [formField]="consent.signature" />`,
})
export class Consent {
  readonly model = signal({ signature: null as string | null });
  readonly consent = form(this.model, (path) => required(path.signature));
}
```

`disabled()` and `readonly()` rules on the field disable or lock the signature.

### Reactive forms (`formControlName`)

```ts
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature } from '@digital-signature-field/angular';

@Component({
  selector: 'app-consent',
  imports: [DsfSignature, ReactiveFormsModule],
  template: `<form [formGroup]="group"><dsf-signature formControlName="signature" /></form>`,
})
export class Consent {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });
}
```

### Template-driven forms (`ngModel`)

```ts
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DsfSignature } from '@digital-signature-field/angular';

@Component({
  selector: 'app-consent',
  imports: [DsfSignature, FormsModule],
  template: `<form><dsf-signature name="signature" required [(ngModel)]="signature" /></form>`,
})
export class Consent {
  readonly signature = signal<string | null>(null);
}
```

In every style:

- **Drawing** (a stroke, undo, redo, clear) updates the control and marks it dirty.
- **Writing a value from the form** (initial data, `setValue`, `reset`) loads it into the field. It never marks the control dirty and starts a fresh undo history.
- **Touched**: the control is touched when focus leaves the field, or when a stroke ends while it is untouched.
- **Disabled**: a disabled control blocks drawing, the built-in actions and the keyboard shortcuts.

### Angular 17–21: CVA mode (`dsfCva`)

> Before Angular 22, Angular forms (`formControlName`, `[formControl]`, `ngModel`) can only bind to components that provide a `ControlValueAccessor`. Adding the `dsfCva` attribute turns on **CVA mode**: a small directive that provides one for `<dsf-signature>`. Import `DsfSignatureCva` next to `DsfSignature` and write `<dsf-signature dsfCva formControlName="signature" />` (or `dsfCva [(ngModel)]="…"`). Value, dirty, touched and disabled then behave as above. On Angular 22+ leave it off: the component already works with every forms style. Never combine `dsfCva` with `[formField]`.

## Without forms: `[(value)]`

```html
<dsf-signature [(value)]="signature" actions="undo redo clear" />
```

No forms module is needed. Setting `signature` loads that value into the field; drawing writes the new value back.

## Inputs

Every element setting is an input with the element property's name ([API reference](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/docs/api.md)). Inputs you don't bind keep the element's defaults.

| Input | Type |
| --- | --- |
| `value` (model) | `string \| SignatureData \| null` |
| `disabled`, `readonly`, `required`, `invalid`, `touched` | `boolean` (forms set these for you) |
| `name` | `string` |
| `valueFormat` | `'svg' \| 'png' \| 'json'` |
| `background`, `penColor` | CSS colour |
| `penWidth`, `smoothing`, `minStrokes`, `minStrokeLength`, `historyLimit` | `number` |
| `pressure` | `boolean` |
| `actions` | space-separated tokens: `undo redo clear color width`, or `none` |
| `actionsPosition` | `'bottom' \| 'top' \| 'start' \| 'end'` |
| `labels` | `Partial<Labels>` |
| `penColors` | `string[]` |
| `styles` | `string \| CSSStyleSheet \| Array<string \| CSSStyleSheet>` |

While `invalid` is set, the host has the `dsf-invalid` class.

## Outputs

| Output | Payload | When |
| --- | --- | --- |
| `historyChange` | `{ canUndo, canRedo, empty }` | Whenever any of the three changes. Drives an external toolbar. |
| `strokeStart` | `{ strokeCount }` | A stroke became long enough to keep (taps never fire it). |
| `strokeEnd` | `{ strokeCount }` | A stroke was kept. |
| `touch` | — | Focus left the field, or a stroke ended while the control was untouched. |

Value changes come through the `value` model.

## Methods

Get the component with `viewChild(DsfSignature)` to build an external toolbar or export on demand:

```ts
readonly signature = viewChild.required(DsfSignature);

undo() { this.signature().undo(); }
async download() { const png = await this.signature().toPNG({ scale: 2 }); /* … */ }
```

`undo()`, `redo()`, `clear()`, `toSVG()`, `toPNG({ scale? })`, `toJSON()` and `focus()`. They work in the browser once the view has rendered; before that (and on the server) they throw.

## Server-side rendering

`<dsf-signature>` is safe to render on the server. The element package is loaded with a dynamic import after the first render in the browser, and the element is only touched once it is defined. The server output contains an empty `<digital-signature-field>`, which upgrades on the client.

## Versioning

`@digital-signature-field/angular` depends on `@digital-signature-field/element` at exactly its own version: both packages are released together with one shared version, from GitHub Actions with npm provenance. Changes: [CHANGELOG](https://github.com/DenysSlobodianyk1996/digital-signature-field/blob/main/CHANGELOG.md).

## License

MIT
