import { matchingLocalizationTable } from '../../src/localizations/getLocalizationTable';

export interface Localization {
    localStorageSave: string;
    databaseLoadError: string;
    untitledImage: string;

    newImageHeading: string;
    new: string;

    save: string;
    delete: string;
    reallyDelete: (imageName: string) => string;
}

const localizationTables: Record<string, Localization> = { };

localizationTables.en = {
	localStorageSave: 'Local Storage',
	databaseLoadError: 'Database failed to load.',
	untitledImage: 'Untitled Image',

	newImageHeading: 'New Image',
	new: 'New',

	save: 'Save',
	delete: 'Delete',
	reallyDelete: (imageName) => `Are you sure you want to delete ${imageName}?`,
};

localizationTables.es = {
	// Default to English for untranslated strings;
	...localizationTables.en,

	new: 'Crear',
	save: 'Guardar',
	delete: 'Borrar',
};

export const getLocalizationTable = () => {
	return matchingLocalizationTable(navigator.languages, localizationTables, localizationTables.en);
};
