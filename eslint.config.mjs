import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default [
	{
		ignores: ['**/*.bundle.js', '**/dist/', 'docs/typedoc/', '**/icons/*.svg.ts', '**/*.md.ts'],
	},
	...tseslint.config(
		eslint.configs.recommended,
		...tseslint.configs.recommended,
		...tseslint.configs.recommendedTypeChecked,
		{
			languageOptions: {
				globals: {
					...globals.browser,
					...globals.node,
				},

				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',

				parserOptions: {
					project: './tsconfig.eslint.json',
				},
			},
		},
		{
			files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
			...tseslint.configs.disableTypeChecked,
		},
		{
			rules: {
				'no-unused-vars': 'off',
				'@typescript-eslint/no-unused-vars': [
					'error',
					{
						'argsIgnorePattern': '^_',
					}
				],
				// The no-base-to-string rule seems to fail even in some cases where a toString is defined.
				'@typescript-eslint/no-base-to-string': 'off',
				// We use namespaces to create fake static methods on interfaces
				'@typescript-eslint/no-namespace': 'off',
				'@typescript-eslint/restrict-template-expressions': 'off',

				// TODO: Remove these and fix the related issues:
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-argument': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-floating-promises': 'off',
				'@typescript-eslint/no-misused-promises': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/require-await': 'off',
			}
		}
	),
	nounsanitized.configs.recommended,
	eslintConfigPrettier,
];
