# digital-signature-field

A hand-drawn signature as a form field: a framework-free custom element (`@digital-signature-field/element`) plus an Angular wrapper (`@digital-signature-field/angular`), with demo apps for Angular, React and Vue. See `README.md`. The repo is in its design phase; the decisions are in `docs/adr/` and the planned API in `docs/api.md`.

## Development

Nx 24 + pnpm 10 workspace (Node >= 22). Projects: `packages/element` (Nx project `element`); later `packages/angular` and `apps/demo-angular`, `apps/demo-angular-17`, `apps/demo-react`, `apps/demo-vue` (ADR-0002). Targets are explicit `nx:run-commands` in each `project.json`.

```bash
pnpm install                                  # first run also: pnpm exec playwright install chromium firefox webkit
pnpm nx serve element                         # dev page (packages/element/index.html) at http://localhost:5173
pnpm nx run-many -t lint                      # ESLint (root eslint.config.js)
pnpm nx run-many -t typecheck                 # tsc --noEmit, lib + spec configs
pnpm nx run-many -t build                     # Vite lib build + .d.ts into packages/element/dist
pnpm nx run-many -t test                      # Vitest browser mode: Chromium, Firefox, WebKit
DSF_BROWSERS=chromium,webkit pnpm nx test element   # narrow the browsers locally
pnpm nx affected -t lint typecheck build test # what CI runs (.github/workflows/ci.yml)
```

- Browser tests (seam 1, the element's public contract) live next to the source as `packages/element/src/*.test.ts`, configured in `packages/element/vitest.config.ts`. They import `@digital-signature-field/element` (aliased to `src/index.ts`) and drive only the public surface: synthetic pointer events on `::part(area)`, `change` events, `value`.
- Legacy-defect regression tests are named after the defect (e.g. "a tap does not produce a value") inside `describe('legacy regressions')`.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `DenysSlobodianyk1996/digital-signature-field` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
