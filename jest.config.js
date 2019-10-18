const lernaJson = require('./lerna.json');

module.exports = {
  globals: {
    __DEV__: true,
    __VERSION__: lernaJson.version,
    __BROWSER__: false
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: ['packages/*/src/**/*.js'],
  watchPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@algeff/(.*?)$': '<rootDir>/packages/$1/src'
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  rootDir: __dirname,
  testMatch: ['<rootDir>/packages/**/__tests__/**/*test.[jt]s?(x)']
};
