// Karma for the Angular 17 seam-2 tests. Runs in the Chromium that Playwright installs
// (`pnpm exec playwright install chromium`), so no system Chrome is needed locally or in CI.
process.env.CHROME_BIN ??= require('playwright').chromium.executablePath();

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: { clearContext: true },
    reporters: ['progress'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] },
    },
    singleRun: true,
    restartOnFileChange: false,
  });
};
