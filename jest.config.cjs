module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(?:mjs|cjs|[jt]sx?)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  extensionsToTreatAsEsm: [],
};
