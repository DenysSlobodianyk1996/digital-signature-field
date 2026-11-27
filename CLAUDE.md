# digital-signature-field

A hand-drawn signature as a form field: a framework-free custom element (`@digital-signature-field/element`) plus an Angular wrapper (`@digital-signature-field/angular`), with demo apps for Angular, React and Vue. See `README.md`. The decisions are in `docs/adr/` and the API in `docs/api.md`.

## Development

Nx 24 + pnpm 10 workspace (Node >= 22). Projects: `packages/element` (`element`), `packages/angular` (`angular`, built with ng-packagr against Angular 17.2 / TS 5.3), `apps/demo-angular` (`demo-angular`, latest Angular), `apps/demo-angular-17` (`demo-angular-17`, Angular 17 / TS 5.3), `apps/demo-react` (`demo-react`, React 19 + Vite) and `apps/demo-vue` (`demo-vue`, Vue 3 + Vite) (ADR-0002), and `apps/site` (`site`, the GitHub Pages site that assembles the four demo builds; deployed by `.github/workflows/pages.yml` on push to `main`, ADR-0010). Targets are explicit `nx:run-commands` in each `project.json`.

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
pnpm nx serve demo-react                      # or demo-vue: Vite dev server on the built element package
DSF_DEMO_BASE=/react/ pnpm nx build demo-react # any demo builds under a sub-path (must end in /; Angular: --base-href)
pnpm nx e2e-pages site                        # GitHub Pages site: all demos under their sub-paths in apps/site/dist, checked by Playwright
pnpm nx preview-pages site                    # serve it like GitHub Pages at http://localhost:4390/digital-signature-field/
pnpm nx run-many -t pack                      # npm pack --dry-run per package, checked by tools/check-package.mjs
pnpm nx release --skip-publish --dry-run       # preview the next version + CHANGELOG (real releases: release.yml in CI only)
pnpm nx affected -t lint typecheck build test e2e pack   # what CI runs (.github/workflows/ci.yml)
```

- Releases (ADR-0009): `nx.json` `release` = fixed version for `element` + `angular`, conventional commits, root `CHANGELOG.md`, tag `v{version}`. `.github/workflows/release.yml` runs on every push to `main`: the first release (no `v*` tag yet) is exactly `1.0.0`; after that the bump comes from the conventional commits since the last tag (`fix` → patch, `feat` → minor, `!`/`BREAKING CHANGE` → major), and a push with only `chore`/`docs`/`test`/`ci` commits releases nothing. It versions both packages, commits `chore(release): publish x.y.z`, tags, and publishes via npm trusted publishing (OIDC, no `NPM_TOKEN`); manual dispatch (dry-run by default) and pushed `v*` tags also work. Write PR titles/squash commits as conventional commits, since they decide the version. The angular package publishes from `packages/angular/dist`; its build runs `scripts/publishable-manifest.mjs`, which turns `workspace:*` into the element's exact version and drops the workspace-only `publishConfig.directory/linkDirectory`.

- Browser tests (seam 1, the element's public contract) live next to the source as `packages/element/src/*.test.ts`, configured in `packages/element/vitest.config.ts`. They import `@digital-signature-field/element` (aliased to `src/index.ts`) and drive only the public surface: synthetic pointer events on `::part(area)`, `change` events, `value`.
- Angular forms tests (seam 2) live in the apps, not the package: `apps/demo-angular/src/*.spec.ts` (Angular unit-test builder, Vitest browser mode, Chromium) cover `[formField]`, `formControlName`, `ngModel` and the wrapper's inputs/outputs/methods; `apps/demo-angular-17/src/*.spec.ts` (Karma + Jasmine in Playwright's Chromium) cover CVA mode (`dsfCva`) with reactive and template-driven forms. `packages/angular/test/ssr.test.mjs` (`nx test angular`, `node --test`) server-renders the built wrapper with Angular 17.2's platform-server. Smoke tests: `apps/*/e2e/*.spec.ts`.
- The apps consume `@digital-signature-field/angular` from `packages/angular/dist` (pnpm `publishConfig.linkDirectory`), with `preserveSymlinks` in the app build so the wrapper uses the app's Angular, not the 17.2 copy it was built with. Build the package first (Nx does this via `^build`).
- React/Vue demo smoke tests: `apps/demo-{react,vue}/playwright.config.ts` + `e2e/*.spec.ts`, against `vite preview` of the build, each app on its own port (angular 4310, angular-17 4317, react 4319, vue 4329). Their `e2e/readme.spec.ts` checks the README recipes are verbatim copies of the demo files. These demos consume the element's built `dist` (workspace dependency), not the source path alias.
- Local gotchas: demo Playwright configs reuse an already-running server on their port outside CI, so with several worktrees running e2e at once use `CI=1` to force each run to start its own. `ng test` in demo-angular caches the built wrapper/element under `apps/demo-angular/node_modules/.vite`; delete it after rebuilding `element`/`angular`, or seam-2 tests run stale code.
- Legacy-defect regression tests are named after the defect (e.g. "a tap does not produce a value") inside `describe('legacy regressions')`.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `DenysSlobodianyk1996/digital-signature-field` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
