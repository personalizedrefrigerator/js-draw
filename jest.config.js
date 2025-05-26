// Test configuration
// See https://jestjs.io/docs/configuration#testenvironment-string

const config = {
	preset: 'ts-jest',

	// File extensions for imports, in order of precedence:
	moduleFileExtensions: ['ts', 'js'],

	testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],

	// Mocks.
	// See https://jestjs.io/docs/webpack#handling-static-assets
	moduleNameMapper: {
		// Webpack/ESBuild allows importing CSS files. Mock it.
		'\\.(css|lessc)': '<rootDir>/testing/mocks/styleMock.js',
		'@melloware/coloris': '<rootDir>/testing/mocks/coloris.ts',
	},

	testEnvironment: 'jsdom',
	testEnvironmentOptions: {
		// Prevents scripts from running within iframes (including sandboxed iframes)
		// which prevents "Error: The SVG sandbox is broken! Please double-check the sandboxing setting."
		// from being repeatedly logged to the console during testing.
		runScripts: 'outside-only',
	},
	setupFilesAfterEnv: ['<rootDir>/testing/beforeEachFile.ts'],
};

module.exports = config;
