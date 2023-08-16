
import { EditorView, basicSetup } from 'codemirror';
import { syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle } from '@codemirror/language';


// See https://codemirror.net/examples/styling/
// and https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
const codeMirrorTheme = EditorView.theme({
	'&': {
		color: 'var(--cm-primary-text-color)',
		backgroundColor: 'var(--cm-primary-background-color)',

		border: '1px solid var(--color-accent)',
		borderRadius: '0.8em',
		overflow: 'hidden',

		fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
		fontSize: '0.9em',
	},

	// Change the selection color. See https://codemirror.net/examples/styling/
	'.cm-content': {
		caretColor: 'var(--cm-caret-color)',
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: 'var(--cm-caret-color)',
	},
	// Needs high specificity to override the default
	'& .cm-selectionLayer .cm-selectionBackground, &.cm-focused .cm-selectionLayer .cm-selectionBackground, ::selection': {
		background: 'var(--cm-selection-background)',
		backgroundColor: 'var(--cm-selection-background) !important',
	},
	'.cm-activeLine': {
		// Default color
		color: 'var(--cm-primary-text-color)',
		backgroundColor: 'transparent',
	},

	'.cm-gutters': {
		backgroundColor: 'var(--cm-secondary-background-color)',
		color: 'var(--cm-secondary-text-color)',
		border: 'none',
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'var(--cm-secondary-background-color)',
		color: 'var(--cm-secondary-text-color)',
		fontWeight: 'bold',
	},

	'.cm-tooltip': {
		backgroundColor: 'var(--cm-secondary-background-color)',
		color: 'var(--cm-secondary-text-color)',
		boxShadow: '2px 0px 0px var(--cm-shadow-color)'
	}
});

const codeMirrorHighlightStyle = HighlightStyle.define([
	{ tag: tags.keyword, color: 'var(--cm-keyword-color)' },
	{ tag: tags.comment, color: 'var(--cm-comment-color)' },
	{ tag: tags.string, color: 'var(--cm-string-color)' },
	{ tag: tags.paren, color: 'var(--cm-paren-color)' },
	{ tag: tags.variableName, color: 'var(--cm-varname-color)' },
]);

const addCodeMirrorEditor = (initialText: string, parent: HTMLElement) => {
	const editor = new EditorView({
		extensions: [
			basicSetup,
			javascript(),
			codeMirrorTheme,
			syntaxHighlighting(codeMirrorHighlightStyle),
		],
		parent,
	});
	editor.dispatch({
		changes: { from: 0, insert: initialText },
	});

	return {
		getText() {
			return editor.state.doc.toString();
		},
	};
};

export default addCodeMirrorEditor;