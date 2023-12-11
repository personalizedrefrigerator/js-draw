import { matchingLocalizationTable } from 'js-draw';

export interface Localization {
	debugWidgetTitle: string;
}

export const defaultLocalizations: Localization = {
	debugWidgetTitle: 'Debug',
};

export const localizationTables: Record<string, Localization> = {
	en: {
		...defaultLocalizations,
	},
};

export const getLocalizationTable = () => {
	return matchingLocalizationTable(navigator.languages, localizationTables, defaultLocalizations);
};
