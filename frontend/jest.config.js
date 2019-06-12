module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['jest-preset-angular/setupJest'],
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
      astTransformers: ['jest-preset-angular/InlineHtmlStripStylesTransformer'],
    },
  },
}

