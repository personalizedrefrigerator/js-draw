
import { defaultEditorLocalization, EditorLocalization } from '../localization';
import en from './en';
import es from './es';

const allLocales: Record<string, EditorLocalization> = {
	en,
	es,
};

// [locale]: A string in the format languageCode_Region or just languageCode. For example, en_US.
const languageFromLocale = (locale: string) => {
	const matches = /^(\w+)[_-](\w+)$/.exec(locale);
	if (!matches) {
		// If not in languageCode_region format, the locale should be the
		// languageCode. Return that.
		return locale;
	}

	return matches[1];
};

const getLocalizationTable = (userLocales?: readonly string[]): EditorLocalization => {
	userLocales ??= navigator.languages;

	let prevLanguage: string|undefined;
	for (const locale of userLocales) {
		const language = languageFromLocale(locale);

		// If the specific localization of the language is not available, but
		// a localization for the language is,
		if (prevLanguage && language !== prevLanguage) {
			if (prevLanguage in allLocales) {
				return allLocales[prevLanguage];
			}
		}

		// If the full locale (e.g. en_US) is available,
		if (locale in allLocales) {
			return allLocales[locale];
		}

		prevLanguage = language;
	}

	if (prevLanguage && prevLanguage in allLocales) {
		return allLocales[prevLanguage];
	} else {
		return defaultEditorLocalization;
	}
};

export default getLocalizationTable;