module.exports = {
  root: true,
  extends: ['next', 'next/core-web-vitals'],
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'coverage/**',
    'lib/admin-users.mjs',
    '**/*.d.ts',
  ],
  rules: {
    '@next/next/no-img-element': 'off',
  },
  overrides: [
    {
      files: [
        'app/**/*.{js,jsx}',
        'components/**/*.{js,jsx}',
        'lib/**/*.{js,mjs}',
        'pages/**/*.{js,jsx}',
        'scripts/**/*.{js,mjs}',
      ],
      env: {
        browser: true,
        node: true,
      },
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        'no-empty': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      files: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'pages/**/*.{ts,tsx}',
        'scripts/**/*.{ts,tsx}',
      ],
      env: {
        browser: true,
        node: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        'no-empty': 'off',
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['__tests__/**/*.{js,jsx}'],
      env: {
        jest: true,
        node: true,
        browser: true,
      },
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        'no-empty': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['__tests__/**/*.{ts,tsx}'],
      env: {
        jest: true,
        node: true,
        browser: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        'no-empty': 'off',
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
};
