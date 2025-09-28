import js from '@eslint/js';
import globals from 'globals';

const sharedLanguageOptions = {
  ecmaVersion: 2023,
  sourceType: 'module',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
};

export default [
  {
    files: [
      'lib/googleMapsLoader.mjs',
      'pages/valuation.js',
      '__tests__/googleMapsLoader.test.js',
      '__tests__/app.test.tsx',
    ],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{js,ts,tsx}'],
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
      'no-unused-vars': 'off',
    },
  },
];
