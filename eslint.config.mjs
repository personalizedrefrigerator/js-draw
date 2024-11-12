import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import eslint from "@eslint/js";
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default [{
    ignores: [
        "**/*.bundle.js",
        "**/dist/",
        "docs/typedoc/",
        "**/icons/*.svg.ts",
        "**/*.md.ts",
    ],
},
...tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
),
nounsanitized.configs.recommended,
eslintConfigPrettier,
{
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            project: "./tsconfig.eslint.json",
        },
    },
},
{
    files: ["./**/*.js"],
    ...tseslint.configs.disableTypeChecked,
},
{
    rules: {
        'linebreak-style': ['error', 'unix'],
		'no-constant-binary-expression': 'error',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
		'@typescript-eslint/only-throw-error': 'error',
		'@typescript-eslint/prefer-promise-reject-errors': 'error',

		// Disable: editor.dispatch code can return either void or Promise<void>, depending on the command.
		// TODO: Refactor.
		// '@typescript-eslint/no-floating-promises': 'error',

		// Disable: In many cases, the built-in DOM types are incorrect in insecure contexts and older
		// browsers and so many seemingly-unnecessary conditionals are necessary.
		'@typescript-eslint/no-unnecessary-condition': 'off',

		'@typescript-eslint/restrict-template-expressions': 'off',

		// Ideally, this should be closer to 20. However, several blocks of old
		// code prevent this.
		complexity: ['error', 40],

		// A subset of the default recommended-type-checked rules.
		// See https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-type-checked.ts
		// for the full list.
		// Disallows TypeScript directives that restrict error reporting
		'@typescript-eslint/ban-ts-comment': 'error',
		// Bans types like Function and Object that should be more specific
		'@typescript-eslint/no-restricted-types': 'error',
		'@typescript-eslint/no-empty-object-type': 'error',
		'@typescript-eslint/no-wrapper-object-types': 'error',
		'@typescript-eslint/no-unsafe-function-type': 'error',

		// Replace several ESLint defaults with the TypeScript equivalents
		'@typescript-eslint/no-array-constructor': 'error',
		'no-array-constructor': 'off',
		'@typescript-eslint/no-loss-of-precision': 'error',
		'no-loss-of-precision': 'off',
		'@typescript-eslint/no-implied-eval': 'error',
		'no-implied-eval': 'off',

		'@typescript-eslint/no-duplicate-enum-values': 'error',
		'@typescript-eslint/no-duplicate-type-constituents': 'error',
		'@typescript-eslint/no-extra-non-null-assertion': 'error',
		'@typescript-eslint/no-for-in-array': 'error',
		'@typescript-eslint/no-misused-new': 'error',
		// Disallows ! non-null assertions in conditional chains (e.g. thing?.test!).
		'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
		'@typescript-eslint/no-this-alias': 'error',
		'@typescript-eslint/unbound-method': [
			'error',
			{
				ignoreStatic: true,
			},
		],

		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
			},
		],
		'@typescript-eslint/no-explicit-any': 'off',

		// namespaces can be useful when defining helper methods for interfaces.
		'@typescript-eslint/no-namespace': 'off',
    }
}];