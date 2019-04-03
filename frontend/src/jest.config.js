module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/src/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
    },
  },
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@angular-builders/jest/src/jest-config/setup.js',
  ],
  transform: {
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|js)?(x)',
    '**/+(*.)+(spec|test).+(ts|js)?(x)',
  ],
  moduleNameMapper: {
    //For avoid long imports with ...
    'app/(.*)': '<rootDir>/src/app/$1',
    '@common/(.*)': '<rootDir>/src/app/common/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!@ngrx)'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/**e2e/**/*.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/environments/**',
    '!src/main.ts',
    '!src/polyfills.ts',
    '!**/*.module.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'src/app/*.{js}'],
  testResultsProcessor: 'jest-sonar-reporter',
};
