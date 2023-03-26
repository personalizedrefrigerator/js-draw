
import { defaultEditorLocalization, EditorLocalization } from '../localization';
import de from './de';
import en from './en';
import es from './es';

const allLocales: Record<string, EditorLocalization> = {
	de,
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

/**
 * Return the localization table in `localizationTables` that best matches
 * the list of `userLocales`. If there is no matching language, returns
 * `defaultLocalizationTable`.
 */
export const matchingLocalizationTable = <T> (
	userLocales: readonly string[],
	localizationTables: Record<string, T>,
	defaultLocalizationTable: T
): T => {
	let prevLanguage: string|undefined;
	for (const locale of userLocales) {
		const language = languageFromLocale(locale);

		// If the specific localization of the language is not available, but
		// a localization for the language is,
		if (prevLanguage && language !== prevLanguage) {
			if (prevLanguage in allLocales) {
				return localizationTables[prevLanguage];
			}
		}

		// If the full locale (e.g. en_US) is available,
		if (locale in allLocales) {
			return localizationTables[locale];
		}

		prevLanguage = language;
	}

	if (prevLanguage && prevLanguage in allLocales) {
		return localizationTables[prevLanguage];
	} else {
		return defaultLocalizationTable;
	}
}

/**
 * Returns a localization table for the `Editor` that matches
 * the user's current locale.
 * 
 * Returns the default localization table if no appropriate localization
 * exists.
 */
const getLocalizationTable = (userLocales?: readonly string[]): EditorLocalization => {
	userLocales ??= navigator.languages;
	return matchingLocalizationTable(userLocales, allLocales, defaultEditorLocalization);
};

export default getLocalizationTable;