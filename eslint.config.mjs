import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': ts, prettier },
    rules: {
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-undef': 'off', // Temporarily disable no-undef rule for console, process, etc.
      '@typescript-eslint/no-unused-vars': ['warn'], // Downgrade unused vars to warning
      '@typescript-eslint/no-explicit-any': ['warn'], // Downgrade explicit any to warning
    },
  },
];
