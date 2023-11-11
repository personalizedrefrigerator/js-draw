module.exports = {
	'env': {
		'browser': true,
		'es2021': true,
		'node': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended'
	],
	// See https://typescript-eslint.io/linting/troubleshooting/#i-get-errors-telling-me-eslint-was-configured-to-run--however-that-tsconfig-does-not--none-of-those-tsconfigs-include-this-file
	'overrides': [
		{
			'extends': ['plugin:@typescript-eslint/disable-type-checked'],
			'files': ['./**/*.js'],
		},
	],
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'ecmaVersion': 'latest',
		'sourceType': 'module',
		'project': './tsconfig.eslint.json',
	},
	'plugins': [
		'@typescript-eslint'
	],
	'rules': {
		'@typescript-eslint/indent': [
			'error',
			'tab',
			{
				'ignoredNodes': [
					// See https://github.com/typescript-eslint/typescript-eslint/issues/1824
					'TSUnionType',
				]
			}
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'no-constant-binary-expression': 'error',
		'no-trailing-spaces': 'error',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',

		// A subset of the default recommended-type-checked rules.
		// See https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-type-checked.ts
		// for the full list.
		// Disallows TypeScript directives that restrict error reporting
		'@typescript-eslint/ban-ts-comment': 'error',
		// Bans types like Function and Object that should be more specific
		'@typescript-eslint/ban-types': 'error',
		'no-array-constructor': 'off',
		'no-implied-eval': 'off',
		'@typescript-eslint/no-implied-eval': 'error',
		'no-loss-of-precision': 'off',
		'@typescript-eslint/no-loss-of-precision': 'error',
		'@typescript-eslint/no-array-constructor': 'error',
		'@typescript-eslint/no-duplicate-enum-values': 'error',
		'@typescript-eslint/no-duplicate-type-constituents': 'error',
		'@typescript-eslint/no-extra-non-null-assertion': 'error',
		'@typescript-eslint/no-for-in-array': 'error',
		'@typescript-eslint/no-misused-new': 'error',
		// Disallows ! non-null assertions in conditional chains (e.g. thing?.test!).
		'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
		'@typescript-eslint/no-this-alias': 'error',
		'@typescript-eslint/unbound-method': 'error',

		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				'argsIgnorePattern': '^_',
			}
		],
		'@typescript-eslint/no-explicit-any': 'off',

		// namespaces can be useful when defining helper methods for interfaces.
		'@typescript-eslint/no-namespace': 'off',
	},
	'ignorePatterns': [
		'**/*.bundle.js',
		'**/dist/',
		'docs/typedoc/',

		// Auto-generated icon files (e.g. in @js-draw/material-icons)
		'**/icons/*.svg.ts',

		// Files auto-generated from markdown files:
		'**/*.md.ts',
	],
};
