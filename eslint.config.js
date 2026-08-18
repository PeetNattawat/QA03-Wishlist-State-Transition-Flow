// @ts-check
const tseslint = require('typescript-eslint');

/**
 * ESLint flat config (ESLint 10 — `--ext` no longer exists, file globs are declared here).
 * Type-aware linting is enabled so rules such as no-floating-promises can catch
 * missing `await` on Playwright calls, which is the single most common bug class
 * in an automation suite.
 */
module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'reports/**',
      'test-results/**',
      'screenshots/**',
      'playwright-report/**',
      'auth/**',
      'eslint.config.js',
    ],
  },
  // The type-aware preset MUST be scoped to *.ts: without `files`, its rules also
  // load for plain .js files (e.g. scripts/setup.js), and every type-aware rule
  // then crashes with "you have used a rule which requires type information".
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Naming: PascalCase classes, camelCase functions/variables.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variableLike', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
      ],
      // A forgotten `await` silently passes a test — keep this an error.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Fail on unused code so dead locators do not accumulate.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Hard-coded sleeps are banned by the coding standard.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'Do not use waitForTimeout() — use a web-first expect()/waitFor assertion.',
        },
      ],
      // Numbers are safe to interpolate directly (quantities/prices in test labels, etc.).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Playwright fixtures require an empty destructuring pattern to declare "no dependencies".
    files: ['fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  {
    // Plain CommonJS Node tooling (scripts/setup.js) — no type information, and
    // console output is the whole point of a CLI setup script.
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      'no-console': 'off',
    },
  },
);
