import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import root from '../../eslint.config.js';

// Root config plus single-file components.
export default tseslint.config(...root, ...pluginVue.configs['flat/essential'], {
  files: ['**/*.vue'],
  languageOptions: { parserOptions: { parser: tseslint.parser } },
  // TypeScript checks identifiers (globals like FormDataEntryValue).
  rules: { 'no-undef': 'off' },
});
