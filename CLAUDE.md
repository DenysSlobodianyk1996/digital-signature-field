# digital-signature-field

A hand-drawn signature as a form field: a framework-free custom element (`@digital-signature-field/element`) plus an Angular wrapper (`@digital-signature-field/angular`), with demo apps for Angular, React and Vue. See `README.md`. The repo is in its design phase; the decisions are in `docs/adr/` and the planned API in `docs/api.md`.

## Development

Nx 24 + pnpm 10 workspace (Node >= 22). Projects: `packages/element` (`element`), `packages/angular` (`angular`, built with ng-packagr against Angular 17.2 / TS 5.3), `apps/demo-angular` (`demo-angular`, latest Angular) and `apps/demo-angular-17` (`demo-angular-17`, Angular 17 / TS 5.3); later `apps/demo-react`, `apps/demo-vue` (ADR-0002). Targets are explicit `nx:run-commands` in each `project.json`.

```bash
pnpm install                                  # first run also: pnpm exec playwright install chromium firefox webkit
pnpm nx serve element                         # dev page (packages/element/index.html) at http://localhost:5173
pnpm nx run-many -t lint                      # ESLint (root eslint.config.js)
pnpm nx run-many -t typecheck                 # tsc --noEmit, lib + spec configs
pnpm nx run-many -t build                     # Vite lib build + .d.ts into packages/element/dist
pnpm nx run-many -t test                      # element: Vitest browser mode (3 engines); Angular apps: forms tests (seam 2)
DSF_BROWSERS=chromium,webkit pnpm nx test element   # narrow the browsers locally
pnpm nx run-many -t e2e                       # Playwright smoke tests on the built demo apps (seam 3)
pnpm nx serve demo-angular                    # ng serve (demo-angular-17 serves on :4201)
pnpm nx affected -t lint typecheck build test e2e   # what CI runs (.github/workflows/ci.yml)
```

- Browser tests (seam 1, the element's public contract) live next to the source as `packages/element/src/*.test.ts`, configured in `packages/element/vitest.config.ts`. They import `@digital-signature-field/element` (aliased to `src/index.ts`) and drive only the public surface: synthetic pointer events on `::part(area)`, `change` events, `value`.
- Angular forms tests (seam 2) live in the apps, not the package: `apps/demo-angular/src/*.spec.ts` (Angular unit-test builder, Vitest browser mode, Chromium) cover `[formField]`, `formControlName`, `ngModel` and the wrapper's inputs/outputs/methods; `apps/demo-angular-17/src/*.spec.ts` (Karma + Jasmine in Playwright's Chromium) cover CVA mode (`dsfCva`) with reactive and template-driven forms. `packages/angular/test/ssr.test.mjs` (`nx test angular`, `node --test`) server-renders the built wrapper with Angular 17.2's platform-server. Smoke tests: `apps/*/e2e/*.spec.ts`.
- The apps consume `@digital-signature-field/angular` from `packages/angular/dist` (pnpm `publishConfig.linkDirectory`), with `preserveSymlinks` in the app build so the wrapper uses the app's Angular, not the 17.2 copy it was built with. Build the package first (Nx does this via `^build`).
- Legacy-defect regression tests are named after the defect (e.g. "a tap does not produce a value") inside `describe('legacy regressions')`.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `DenysSlobodianyk1996/digital-signature-field` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
