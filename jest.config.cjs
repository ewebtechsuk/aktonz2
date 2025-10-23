module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    'deposits\\.mjs$': '<rootDir>/lib/deposits.cjs',
  },
  transform: {
    '^.+\\.(?:mjs|cjs|[jt]sx?)$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current',
              },
            },
          ],
          '@babel/preset-typescript',
          [
            '@babel/preset-react',
            {
              runtime: 'automatic',
            },
          ],
        ],
      },
    ],
  },
  extensionsToTreatAsEsm: [],
};
