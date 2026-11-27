# digital-signature-field

A hand-drawn signature as a real form field: a framework-free web component (`<digital-signature-field>`) with an Angular wrapper, usable from Angular, React, Vue and plain HTML.

> **Status: design phase.** This repository currently holds the design docs only; no package is published yet. Everything below describes the planned `1.0` API ([API reference](docs/api.md)).

- **Works as a form field everywhere.** It joins native `<form>`s (`name`, `required`, reset). Angular forms work in every flavour (signal, reactive and template-driven). React and Vue use the element directly.
- **Draws with native Pointer Events, no dependencies.** Mouse, touch and pen, with smoothing and optional pressure.
- **Configurable value**: SVG data URL (default), PNG data URL, or lossless JSON. `null` when empty, with a configurable background (`#fff` by default).
- **Undo / redo / clear**, kept outside the drawing area. Use the built-in buttons, your own buttons in slots, or a fully external toolbar.
- **Shadow DOM, still styleable**: CSS custom properties, `::part()`, and injected style sheets.
- **Accessible**: keyboard shortcuts, ARIA labels and live status, RTL.

## Demos

| Framework | Demo | Source |
| --- | --- | --- |
| Angular (latest) — signal + reactive forms | `https://denysslobodianyk1996.github.io/digital-signature-field/angular/` *(planned)* | `apps/demo-angular` |
| Angular 17 — CVA mode | `https://denysslobodianyk1996.github.io/digital-signature-field/angular-17/` *(planned)* | `apps/demo-angular-17` |
| React 19 | `https://denysslobodianyk1996.github.io/digital-signature-field/react/` *(planned)* | `apps/demo-react` |
| Vue 3 | `https://denysslobodianyk1996.github.io/digital-signature-field/vue/` *(planned)* | `apps/demo-vue` |

## Packages

| Package | What | Peer deps |
| --- | --- | --- |
| `@digital-signature-field/element` | The `<digital-signature-field>` custom element | none |
| `@digital-signature-field/angular` | `<dsf-signature>` component + `dsfCva` directive | `@angular/core` & `@angular/forms` `>=17.2` |

Both packages are always released together with the same version.

## Install

### Vanilla JS

```bash
npm i @digital-signature-field/element
```

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

No bundler? Load it from a CDN: `<script type="module" src="https://cdn.jsdelivr.net/npm/@digital-signature-field/element@1/+esm"></script>`.

### Angular

```bash
npm i @digital-signature-field/angular
```

```ts
import { Component, inject, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature } from '@digital-signature-field/angular';

@Component({
  selector: 'app-consent',
  imports: [DsfSignature, FormField, ReactiveFormsModule],
  template: `
    <!-- Signal forms -->
    <dsf-signature [formField]="consent.signature" valueFormat="png" />

    <!-- Reactive forms -->
    <form [formGroup]="legacy">
      <dsf-signature formControlName="signature" />
    </form>

    <!-- No forms: two-way binding -->
    <dsf-signature [(value)]="draft" actions="undo redo clear" />
  `,
})
export class ConsentComponent {
  model = signal({ signature: null as string | null });
  consent = form(this.model, (p) => required(p.signature));

  legacy = inject(FormBuilder).group({ signature: [null, Validators.required] });
  draft = signal<string | null>(null);
}
```

> **Angular 17–21: add the `dsfCva` attribute.** Before Angular 22, Angular forms (`formControlName`, `[formControl]`, `ngModel`) can only bind to components that provide a `ControlValueAccessor`. Adding `dsfCva` turns on **CVA mode**: a small directive that provides one for `<dsf-signature>`. Import `DsfSignatureCva` next to `DsfSignature` and write `<dsf-signature dsfCva formControlName="signature" />`. On Angular 22+ leave it off: the component already works with every forms flavour. Never combine `dsfCva` with `[formField]`.

### React 19

```bash
npm i @digital-signature-field/element
```

```tsx
import '@digital-signature-field/element';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { useEffect, useRef, useState } from 'react';

export function SignatureInput({ onChange }: { onChange: (v: string | null) => void }) {
  const ref = useRef<DigitalSignatureFieldElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const handle = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener('change', handle);
    return () => el.removeEventListener('change', handle);
  }, [onChange]);

  return <digital-signature-field ref={ref} name="signature" required actions="undo clear" />;
}
```

- React 19 passes unknown props to custom elements as **properties**, so `labels={{…}}` and `penColors={[…]}` work directly.
- JSX types: add `"types": ["@digital-signature-field/element/jsx-react"]` to `tsconfig.json`.
- Inside a plain `<form>` you can skip the listener entirely and read the value from `FormData` on submit.

### Vue 3

```bash
npm i @digital-signature-field/element
```

```ts
// vite.config.ts — tell Vue the tag is a custom element
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'digital-signature-field' } } })
```

```vue
<script setup lang="ts">
import '@digital-signature-field/element';
import { ref } from 'vue';

const signature = ref<string | null>(null);
</script>

<template>
  <digital-signature-field
    :value="signature"
    @change="signature = $event.detail.value"
    name="signature"
    required
  />
  <img v-if="signature" :src="signature" alt="Your signature" />
</template>
```

- `:value` + `@change` is the `v-model` equivalent. Writing back the value the field just emitted does nothing, so undo history is kept.
- Use `.prop` for objects and arrays: `:labels.prop="{ clear: 'Erase' }"`.

## Customise

```css
digital-signature-field {
  --dsf-height: 240px;
  --dsf-area-bg: #fffdf5;
  --dsf-radius: 12px;
}
digital-signature-field::part(action-clear) { color: crimson; }
```

```js
sig.styles = `.area { background-image: url(paper.png); }`; // escape hatch, not covered by semver
```

| Want | Set |
| --- | --- |
| Which buttons | `actions="undo redo clear"` · `"none"` for headless |
| Where | `actions-position="bottom|top|start|end"` |
| Value type | `value-format="svg|png|json"` |
| Export background | `background="#fff"` · `"transparent"` |
| Pen | `pen-color`, `pen-width`, `pressure`, `smoothing` |
| Validity | `required`, `min-strokes`, `min-stroke-length` |
| Translations | `labels` property |

See the five layout variants in [docs/variants](docs/variants/README.md) and the full [API reference](docs/api.md).

## Documentation

- [GLOSSARY.md](GLOSSARY.md) — the domain language
- [docs/api.md](docs/api.md) — properties, methods, events, parts, Angular wrapper
- [docs/variants](docs/variants/README.md) — five layout and integration variants with wireframes and code
- [docs/adr](docs/adr) — architecture decisions
- [docs/legacy-analysis.md](docs/legacy-analysis.md) — what the original Angular 9 component did and the bugs this design fixes

## Development (planned)

Nx + pnpm monorepo:

```
packages/element      packages/angular
apps/demo-angular     apps/demo-angular-17     apps/demo-react     apps/demo-vue
```

```bash
pnpm install
pnpm nx serve demo-angular        # or demo-react / demo-vue / demo-angular-17
pnpm nx run-many -t test e2e
pnpm nx release                   # CI only
```

## License

[MIT](LICENSE)
