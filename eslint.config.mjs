import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const sharedLanguageOptions = {
  ecmaVersion: 2024,
  sourceType: 'module',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const ignoredPaths = [
  'node_modules/**',
  '.next/**',
  'out/**',
  'coverage/**',
  'lib/admin-users.mjs',
];

const appAndPagesGlobs = [
  'app/**/*.{js,jsx}',
  'components/**/*.{js,jsx}',
  'lib/**/*.{js,mjs}',
  'pages/**/*.{js,jsx}',
  'scripts/**/*.{js,mjs}',
];

const appAndPagesTypeScriptGlobs = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
  'pages/**/*.{ts,tsx}',
  'scripts/**/*.{ts,tsx}',
];

export default [
  {
    ignores: [...ignoredPaths, '**/*.d.ts'],
  },
  {
    files: appAndPagesGlobs,
    languageOptions: {
      ...sharedLanguageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      'no-empty': 'off',
      'no-unused-vars': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: appAndPagesTypeScriptGlobs,
    languageOptions: {
      ...sharedLanguageOptions,
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      'no-empty': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{js,jsx}'],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      ...sharedLanguageOptions,
      parser: tsParser,
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
