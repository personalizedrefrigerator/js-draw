
import * as fs from 'fs';
import * as path from 'path';

import { defaultEditorLocalization } from '../packages/js-draw/src/localization';

// Adds markdown formatting to format text like code.
const codeFormat = (text: string) => {
	let maxConsecutiveBackticks = 0;

	// Find the longest number of consecutive backticks — we need to have more
	// than that for the delimiters.
	const backtickRuns = text.matchAll(/[`]+/g);
	for (const backticks of backtickRuns) {
		if (backticks.length > maxConsecutiveBackticks) {
			maxConsecutiveBackticks = backticks.length;
		}
	}

	let codeStartEnd = '';
	for (let i = 0; i < maxConsecutiveBackticks + 1; i++) {
		codeStartEnd += '`';
	}

	// If the text already starts with a `, add a space to prevent the
	// markdown parser from treating it as part of the delimiter.
	if (text.startsWith('`')) {
		text = ' ' + text;
	}

	if (text.endsWith('`')) {
		text = text + ' ';
	}

	return `${codeStartEnd}${text}${codeStartEnd}`;
};

const collapseSpaces = (text: string) => text.replace(/\s+/g, ' ');

const generateTranslationTemplate = () => {
	const bodyContentLines: string[] = [];

	const addInput = (
		type: string, id: string, attrs: Record<string, string>, required: boolean = false
	) => {
		const lines: string[] = [];
		lines.push(`  - type: ${type}`);
		lines.push(`    id: ${id}`);
		lines.push('    attributes:');

		for (const key in attrs) {
			const value = `${attrs[key]}`;

			const escapedValue = value.replace(/[\\]/g, '\\\\').replace(/"/g, '\\"');
			lines.push(`      ${key}: "${escapedValue}"`);
		}

		lines.push('    validations:');
		lines.push(`      required: ${required}`);

		bodyContentLines.push(...lines);
	};

	const addLabel = (text: string) => {
		bodyContentLines.push('  - type: markdown');
		bodyContentLines.push('    attributes:');
		bodyContentLines.push('      value: |');
		bodyContentLines.push('        ' + text);
	};

	addLabel(collapseSpaces(`
		Thank you for taking the time to translate \`js-draw\`! If you don't have time to translate
		all of the strings below, feel free to submit an incomplete translation and edit it later.
		Use this template to update an existing translation or to create a new translation.
	`));

	addLabel(collapseSpaces(`
		(Optional) If you would like to submit a pull request that applies this translation, 
		note that existing translations are present in
		[src/localizations/](https://github.com/personalizedrefrigerator/js-draw/tree/main/src/localizations).
	`));

	addInput('input', 'language-name', {
		label: 'Language',
		description: 'The name of the language to translate to in English (e.g. Spanish)',
	}, true);

	for (const key in defaultEditorLocalization) {
		const englishTranslation = `${(defaultEditorLocalization as any)[key]}`;
		addInput('input', `translation-${key}`, {
			label: `${key}`,
			description: `Translate ${codeFormat(englishTranslation)}.`,
			placeholder: englishTranslation,
		});
	}

	addInput('textarea', 'additional-comments', {
		label: 'Additional information',
		placeholder: 'Any additional information/comments on the translation can go here.',
	});

	return `name: Translation
# This template is auto-generated by build_tools/buildTranslationTemplate.ts
# Do not modify it directly.
description: Translate the editor to a new language!
title: "[Translation]: <language>"
labels: [localization]
assignees: []
body:
${bodyContentLines.join('\n')}`;
};

const template = generateTranslationTemplate();

// According to https://stackoverflow.com/a/13650454, fs should
// be able to handle forward and back slashes (both) on Windows (so extra
// path logic shouldn't be needed here.)
const rootDir = path.dirname(__dirname);
const translationTempaltePath = path.join(rootDir, '.github/ISSUE_TEMPLATE/translation.yml');

fs.writeFileSync(translationTempaltePath, template);