import { Editor, defaultEditorLocalization } from 'js-draw';
import MaterialIconProvider from '@js-draw/material-icons';
import 'js-draw/styles';

(window as any).defaultEditorLocalization = defaultEditorLocalization;

const generateTranslationScript = (input: string) => {
	const data = new Map<string, string>();

	const lines = input.split('\n');

	let nextKey: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		if (line.startsWith('### ')) {
			nextKey = line.replace(/^###\s*/, '');
			continue;
		}
		if (!nextKey || !line.trim()) continue;

		let value = line;

		// Handle markdown-format line blocks
		if (line === '```shell') {
			const valueLines = [];

			i++;
			for (; i < lines.length; i++) {
				line = lines[i];
				if (line === '```') {
					break;
				}

				valueLines.push(line);
			}

			value = valueLines.join('\n');
		}

		if (value && value.replace(/^[_](.*)[_]$/, '$1') !== 'No response') {
			data.set(nextKey, value);
			nextKey = null;
		}
	}

	const lang = data.get('Language');
	data.delete('Language');

	const translationLines: string[] = [];
	for (let [key, value] of data) {
		key = key.replace(/[^0-9a-zA-Z_]/g, '_');
		if (key.startsWith('_')) {
			throw new Error('Invalid key, ' + key);
		}

		if (!value.match(/^(?:function|\(.*=>)/)) {
			value = JSON.stringify(value);
		}

		translationLines.push(`\t${key}: ${value},`);
	}

	const warningLine =
		"console.warn('This file needs to be manually verified -- translations can contain JavaScript');";

	const tsFileData = [
		"import { defaultEditorLocalization, EditorLocalization } from '../localization';",
		'',
		warningLine,
		`// ${lang} localization`,
		'const localization: EditorLocalization = {',
		'\t...defaultEditorLocalization,',
		...translationLines,
		'};',
		'',
		'export default localization;',
	];

	const jsFileData = ['({', '\t...defaultEditorLocalization,', ...translationLines, '})'];

	return {
		ts: tsFileData.join('\n'),
		js: jsFileData.join('\n'),
	};
};

const htmlToMarkdown = (html: string) => {
	const dom = new DOMParser().parseFromString(
		`<!DOCTYPE html><html><body>${html}</body></html>`,
		'text/html',
	);
	const headers = dom.querySelectorAll('h1, h2, h3, h4, h5');

	// Header markup
	for (const header of headers) {
		const headerLevel = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(header.tagName) + 1;
		header.prepend('\n', '#'.repeat(headerLevel) + ' ');
		header.append('\n');
	}

	// Code markup
	const codeBlocks = dom.querySelectorAll('pre');
	for (const block of codeBlocks) {
		block.prepend('```shell\n', document.createElement('br'));
		block.append(document.createElement('br'), '\n```');
	}
	return dom.body.textContent ?? '';
};

const main = () => {
	const translationInput = document.querySelector<HTMLTextAreaElement>('#localization-data')!;
	const typeScriptOutput = document.querySelector<HTMLElement>('#generated-typescript')!;
	const javaScriptOutput = document.querySelector<HTMLElement>('#generated-javascript')!;
	const submitButton = document.querySelector<HTMLElement>('#submit-button')!;

	let translationJs = '';
	let translationTs = '';

	const updateTranslations = () => {
		try {
			const translations = generateTranslationScript(translationInput.value);
			translationJs = translations.js;
			translationTs = translations.ts;

			javaScriptOutput.textContent = translationJs;
			typeScriptOutput.textContent = translationTs;
		} catch (error) {
			console.error(error);
			const errorMessage = `Error: ${error}`;
			typeScriptOutput.textContent = errorMessage;
			javaScriptOutput.textContent = errorMessage;
		}
	};

	translationInput.oninput = () => {
		updateTranslations();
	};

	const insertText = (text: string) => {
		const sliceText = (from: number, to: number) => translationInput.value.substring(from, to);
		translationInput.value =
			sliceText(0, translationInput.selectionStart) +
			text +
			sliceText(translationInput.selectionEnd, translationInput.value.length);
	};

	translationInput.onpaste = (event) => {
		// Convert HTML to Markdown
		const htmlData = event.clipboardData?.getData('text/html');
		if (htmlData) {
			insertText(htmlToMarkdown(htmlData));
			updateTranslations();
			event.preventDefault();
		}
	};

	submitButton.onclick = () => {
		let translations: any = undefined;
		try {
			translations = eval(javaScriptOutput.textContent ?? '');
		} catch (error) {
			alert(error);
			return;
		}

		document.body.replaceChildren();

		const editor = new Editor(document.body, {
			iconProvider: new MaterialIconProvider(),
			localization: translations,
		});

		// For debugging
		(window as any).editor = editor;

		editor.addToolbar();
	};
};

main();
