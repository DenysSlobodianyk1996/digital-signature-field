# The core is a dependency-free custom element; framework packages are thin wrappers

The signature field must be usable from Angular, React, Vue and plain HTML, so the core is a native custom element, `<digital-signature-field>`, with Shadow DOM and no runtime dependencies. Each framework adapts it with a thin wrapper. We rejected two alternatives: exporting an Angular component through `@angular/elements`, which would ship the Angular runtime to React and Vue users, and writing a separate native component per framework, which would mean N implementations to keep consistent.

## Consequences

- Every behaviour (drawing, history, value, validity) lives in the element. Wrappers only translate the framework's form API to the element's properties and events. A behaviour that appears only in a wrapper is a bug.
- The element is form-associated through `ElementInternals`. Inside a plain `<form>` it takes part in `name`, `required`, constraint validation and form reset, with no framework at all.
- Supported browsers are current Chrome, Edge, Firefox and Safari. No polyfills.
