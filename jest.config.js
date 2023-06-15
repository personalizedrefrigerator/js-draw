// Test configuration
// See https://jestjs.io/docs/configuration#testenvironment-string

const config = {
	preset: 'ts-jest',

	// File extensions for imports, in order of precedence:
	moduleFileExtensions: [
		'ts',
		'js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/dist/', '<rootDir>/node_modules/'
	],

	// Mocks.
	// See https://jestjs.io/docs/webpack#handling-static-assets
	moduleNameMapper: {
		// Webpack allows importing CSS files. Mock it.
		'\\.(css|lessc)': '<rootDir>/testing/mocks/styleMock.js',
		'@melloware/coloris': '<rootDir>/testing/mocks/coloris.ts',
	},

	testEnvironment: 'jsdom',
	setupFilesAfterEnv: [ '<rootDir>/testing/beforeEachFile.ts' ],
};

module.exports = config;
