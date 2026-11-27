# Out of scope for v1: dialog mode, React and Vue wrapper packages

Version 1 ships no preview-plus-dialog component, even though the legacy app had one. That layout is shown as a recipe in `demo-angular` instead, because dialogs differ in every design system. Version 1 also ships no React or Vue wrapper packages: React 19 and Vue 3 consume custom elements directly, and the README documents the recipes. Wrappers can be added later as `@digital-signature-field/react` and `@digital-signature-field/vue` if the recipes prove painful.
