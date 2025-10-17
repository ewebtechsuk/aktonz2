module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(?:mjs|cjs|[jt]sx?)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleNameMapper: {
    'deposits\\.mjs$': '<rootDir>/lib/deposits.cjs',
  },
  extensionsToTreatAsEsm: [],
};
