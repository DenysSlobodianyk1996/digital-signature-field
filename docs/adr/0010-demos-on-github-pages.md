# Demo apps deploy to GitHub Pages under one site

All five demo apps deploy to a single GitHub Pages site, each under its own path: `/angular`, `/angular-17`, `/react`, `/vue` and `/html`. Every demo links back to the site index ("← All demos"). They are built by one GitHub Actions workflow on every push to `main`. Each app is built with its base href set to its path. We picked GitHub Pages because it is free, lives next to the code, and needs no third-party account. Netlify and Vercel were the alternatives.
