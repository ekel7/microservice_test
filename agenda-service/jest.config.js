module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  silent: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    'utils/**/*.js',
    'middleware/**/*.js'
  ],
  coverageDirectory: 'coverage'
};
