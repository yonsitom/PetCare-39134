
// https://docs.expo.dev/guides/using-eslint/

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,

  // Archivos generados que ESLint no debe analizar.
  {
    ignores: ['dist/*'],
  },

  // Configuración específica para las pruebas Jest.
  {
    files: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
    ],

    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
]);
