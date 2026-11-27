# Packages publish under a free npm org with one shared version

Packages are published as public packages under the free npm organisation `@digital-signature-field`. The org holds `element` and `angular` now and keeps the names `react` and `vue` free for later. The packages are released together with `nx release`, using conventional commits and a single fixed version, so `element@x.y.z` and `angular@x.y.z` are always compatible. Publishing runs from GitHub Actions with npm provenance, never from a laptop.

## Consequences

- An `NPM_TOKEN` (or npm trusted publishing) has to be set up once, by a human.
- `@digital-signature-field/angular` depends on `@digital-signature-field/element` at the same version.
