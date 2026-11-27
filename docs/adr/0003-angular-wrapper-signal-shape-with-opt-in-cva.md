# One Angular wrapper serves 17.2+: signal-forms shape by default, CVA mode opt-in

We want one Angular package for Angular 17 up to the latest release. The `<dsf-signature>` component exposes `value = model()` plus the optional `disabled`, `readonly`, `invalid`, `touched` and `required` inputs and a `touch` output. That matches the shape of `FormValueControl`, which Angular recognises by structure. On Angular 22+ this works with signal forms (`[formField]`), reactive forms and template-driven forms with no extra code. Angular 17–21 cannot bind forms to a component without a `ControlValueAccessor`, so the package also ships a `dsfCva` directive that adds one. Angular says a component must not implement both, so the directive is opt-in, and the wrapper is built with Angular 17.2 (the first version with `model()`) so that a single package covers the whole range.

## Considered options

- **Only `FormValueControl`, peer `>=22`.** Simplest, but drops Angular 17–21.
- **Only `ControlValueAccessor`.** Still bound to the Angular version it is built with, and it goes against Angular's guidance for signal forms.
- **Two packages, one per Angular range.** Twice the release surface for a difference of about 20 lines.

## Consequences

- The wrapper must not import from `@angular/forms/signals` at runtime or in type positions. That entry point does not exist in Angular 17.
- **Risk:** we need to prove that a library built with Angular 17.2 works when consumed by an Angular 22+ app. The first implementation ticket is a spike that checks this with `[formField]` and `formControlName` in `demo-angular`. If it fails, we fall back to two builds of the package.
- In `demo-angular-17`, CI runs end-to-end tests for CVA mode.
