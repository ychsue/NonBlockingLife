module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/pwa/src/db/test-setup/setupDexie.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
}
