const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    ignores: [
      'dist/**',
      'dist-*/**',
      '.tools/**',
      '.npm-cache/**',
      '.expo/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.cjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
]);
