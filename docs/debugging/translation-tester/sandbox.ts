import { Editor, defaultEditorLocalization } from 'js-draw';
import MaterialIconProvider from '@js-draw/material-icons';
import 'js-draw/styles';

(window as any).defaultEditorLocalization = defaultEditorLocalization;

const generateTranslationScript = (input: string) => {
	const data: Record<string, string> = {};

	const lines = input.split('\n');

	let nextKey: string|null = null;
	for (let i = 0; i < lines.length; i ++) {
		let line = lines[i];
		if (!nextKey) {
			nextKey = line.replace(/^###\s*/, '');
			continue;
		} else if (line.trim() === '') {
			continue;
		}

		let value = line;
		const currentKey = nextKey;
		nextKey = null;

		// Handle markdown-format line blocks
		if (value === '```shell') {
			const valueLines = [];

			i++;
			for (; i < lines.length; i ++) {
				line = lines[i];
				if (line === '```') {
					break;
				}

				valueLines.push(line);
			}

			value = valueLines.join('\n');
		}

		if (value.replace(/^[_](.*)[_]$/, '$1') !== 'No response') {
			data[currentKey] = value;
		}
	}

	const lang = data.Language;
	delete data.Language;

	const translationLines: string[] = [];
	for (let key in data) {
		key = key.replace(/[^0-9a-zA-Z_]/g, '?');
		if (key.startsWith('_')) {
			throw new Error('Invalid key, ' + key);
		}

		let value = data[key];
		if (!value.match(/^(?:function|\(.*=>)/)) {
			value = JSON.stringify(value);
		}

		translationLines.push(`\t${key}: ${value},`);
	}

	const warningLine = 'console.warn(\'This file needs to be manually verified -- translations can contain JavaScript\');';

	const tsFileData = [
		'import { defaultEditorLocalization, EditorLocalization } from \'../localization\';',
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

	const jsFileData = [
		'({',
		'\t...defaultEditorLocalization,',
		...translationLines,
		'})',
	];

	return {
		ts: tsFileData.join('\n'),
		js: jsFileData.join('\n'),
	};
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
