import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'site/dist/',
      'infra/cdk.out/',
      'playwright-report/',
      'test-results/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['site/src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // The service worker is plain JavaScript served verbatim: it is not bundled,
    // so it cannot use TypeScript or module syntax.
    files: ['site/public/sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
  {
    files: ['infra/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', '*.ts', '*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
