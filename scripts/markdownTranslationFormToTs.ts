
// Converts a response to the GitHub translation form to
// possible contents of a TypeScript file.

import {
	createInterface as createReadlineInterface, Interface as ReadlineInterface
} from 'node:readline/promises';
import { stdin, stderr } from 'node:process';

const readAllInput = (inputReader: ReadlineInterface): Promise<string> => {
	const lines: string[] = [];
	inputReader.on('line', line => {
		lines.push(line);
	});

	return new Promise(resolve => {
		inputReader.on('close', () => {
			resolve(lines.join('\n'));
		});
	});
};

const main = async () => {
	const inputReader = createReadlineInterface({ input: stdin, output: stderr });
	inputReader.prompt();

	const input = await readAllInput(inputReader);

	const data: Record<string, string> = {};

	let nextKey: string|null = null;
	for (const line of input.split('\n')) {
		if (!nextKey) {
			nextKey = line;
			continue;
		} else if (line.trim() === '') {
			continue;
		}

		const value = line;
		const currentKey = nextKey;
		nextKey = null;

		if (value !== 'No response') {
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

	const tsFileData = [
		'import { defaultEditorLocalization, EditorLocalization } from \'../localization\';',
		'throw new Error(\'This file needs to be manually verified -- translations can contain JavaScript\');',
		`// ${lang} localization`,
		'const localization: EditorLocalization = {',
		'\t...defaultEditorLocalization,',
		...translationLines,
		'}',
	];

	console.log(tsFileData.join('\n'));
};

void main();