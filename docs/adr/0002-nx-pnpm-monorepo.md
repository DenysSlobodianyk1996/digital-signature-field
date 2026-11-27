# One Nx + pnpm monorepo holds the packages and the demo apps

The two packages (`element`, `angular`) and the four demo apps live in one Nx workspace managed by pnpm. A change to the element can then be checked against every framework in the same pull request, using Nx's affected graph. The element, React and Vue projects build with Vite. The Angular wrapper and the Angular apps build with the Angular CLI builders.

## Layout

```
packages/element        @digital-signature-field/element
packages/angular        @digital-signature-field/angular
apps/demo-angular       latest Angular: signal forms + reactive forms
apps/demo-angular-17    Angular 17: reactive forms in CVA mode (also the compatibility e2e target)
apps/demo-react         React 19 + Vite
apps/demo-vue           Vue 3 + Vite
```
