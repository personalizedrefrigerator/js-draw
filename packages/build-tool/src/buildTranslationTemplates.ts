
import * as fs from 'fs';
import * as path from 'path';
import { BuildConfig, TranslationSourcePair as TranslationSource } from './types';

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

const generateTranslationTemplate = (
	// The name of the project to localize
	projName: string,

	// Strings in the default locale (which has all strings translated)
	defaultLocaleStrings: any,

	// A map from translation keys to comments
	translationComments?: Record<string, string|string[]>,

	// The locale the user will be translating into
	destLocale?: string,

	// Strings in destLocale
	destLocaleStrings?: any,
) => {
	translationComments ??= {};

	const bodyContentLines: string[] = [];

	const addInput = (
		type: string, id: string, attrs: Record<string, string|undefined>, required: boolean = false
	) => {
		const lines: string[] = [];
		lines.push(`  - type: ${type}`);
		lines.push(`    id: ${id}`);
		lines.push('    attributes:');

		for (const key in attrs) {
			if (attrs[key] === undefined) {
				continue;
			}

			const value = `${attrs[key]}`;

			if (value.includes('\n')) {
				const indentation = '        ';
				const indentedValue = indentation + value.replace(/(^|[\n])/g, `\n${indentation}`).trim();
				lines.push(`      ${key}: |\n${indentedValue}`);
			} else {
				const escapedValue = value.replace(/[\\]/g, '\\\\').replace(/"/g, '\\"');
				lines.push(`      ${key}: "${escapedValue}"`);
			}
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
		If you would like to test the translation, **after publishing this issue**, select everything
		from the first "Language" heading to just above the "Additional information" heading and paste
		into [the translation testing tool](https://js-draw.web.app/debugging/translation-tester/).
	`));

	addLabel(collapseSpaces(`
		(Optional) If you would like to submit a pull request that applies this translation, 
		note that existing translations are present in
		[packages/js-draw/src/localizations/](https://github.com/personalizedrefrigerator/js-draw/tree/main/packages/js-draw/src/localizations).
	`));

	addInput('input', 'language-name', {
		label: 'Language',
		description: 'The name of the language to translate to in English (e.g. Spanish)',
		value: destLocale,
	}, true);

	for (const key in defaultLocaleStrings) {
		const englishTranslation = `${defaultLocaleStrings[key]}`;
		let currentTranslation = (destLocaleStrings ?? {})[key];

		// If matching the default, it probably hasn't been translated yet.
		if (currentTranslation === englishTranslation) {
			currentTranslation = undefined;
		}

		let comments: string|string[] = translationComments[key] ?? [];
		if (typeof comments === 'string') {
			comments = [ comments ];
		}
		comments = comments.map(comment => `> **Note**\n> ${comment.replace(/\n/g, '\n> ')}`);

		const description = [
			`Translate ${codeFormat(englishTranslation)}.`,
			...comments,
		].join('\n\n');

		addInput('textarea', `translation-${key}`, {
			label: `${key}`,
			description,
			placeholder: englishTranslation,
			value: currentTranslation,
			render: 'shell',
		});
	}

	addInput('textarea', 'additional-comments', {
		label: 'Additional information',
		placeholder: 'Any additional information/comments on the translation can go here.',
	});

	let description = `Update the "${destLocale}" locale in ${projName}!`;
	if (destLocale === undefined) {
		description = `Translate ${projName} to a new language!`;
	}

	return `name: Translation ${destLocale ? `(${destLocale})` : ''}
# This template is auto-generated by build_tools/buildTranslationTemplate.ts
# Do not modify it directly.
description: ${description}
title: "[Translation]: <language> (${destLocale})"
labels: [localization]
assignees: []
body:
${bodyContentLines.join('\n')}`;
};

const buildTranslationTemplate = async (source: TranslationSource, destFolder: string) => {
	const projName = source.name;

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const translationData = require(source.path);

	const locales = translationData.default ?? translationData.locales;
	const comments = translationData.comments;

	// Write the translation template for the current source.
	// locale should be the destination locale or undefined if there is no specific
	// destination locale.
	const writeTemplate = (locale?: string) => {
		const template = generateTranslationTemplate(
			projName,
			locales[source.defaultLocale],

			// Comments on the translation keys
			comments,

			// Destination locale
			locale,

			// Strings that have already been translated (if any)
			locale ? locales[locale] : undefined,
		);

		// According to https://stackoverflow.com/a/13650454, fs should
		// be able to handle forward and back slashes (both) on Windows (so extra
		// path logic shouldn't be needed here.)
		const translationTempaltePath = path.join(destFolder, `translation-${projName}-${locale ?? 'new'}.yml`);

		fs.writeFileSync(translationTempaltePath, template);
	};

	writeTemplate();

	for (const locale in locales) {
		// Skip the source locale.
		if (locale === source.defaultLocale) {
			continue;
		}

		console.log('Building translation template for locale ', locale);
		writeTemplate(locale);
	}
};

const buildTranslationTemplates = (config: BuildConfig) => {
	const sourceFiles = config.translationSourceFiles;

	for (const sourceFile of sourceFiles) {
		buildTranslationTemplate(sourceFile, config.translationDestPath);
	}
};

export default buildTranslationTemplates;
