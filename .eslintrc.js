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
	'overrides': [
	],
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'ecmaVersion': 'latest',
		'sourceType': 'module'
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
		'no-trailing-spaces': 'error',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
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
