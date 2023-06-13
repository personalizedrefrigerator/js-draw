import { matchingLocalizationTable } from '../../src/localizations/getLocalizationTable';

export interface Localization {
    localStorageSave: string;
    databaseLoadError: string;
    untitledImage: string;

    newImageHeading: string;
    new: string;

	templateLightGrid: string;
	templateDarkGrid: string;

	confirmUnsavedChanges: string;

    save: string;
    delete: string;
    reallyDelete: (imageName: string) => string;
}

const localizationTables: Record<string, Localization> = { };

localizationTables.en = {
	localStorageSave: 'Local Storage',
	databaseLoadError: 'Database failed to load.',
	untitledImage: 'Untitled Image',

	templateLightGrid: 'Light Grid',
	templateDarkGrid: 'Dark Grid',

	confirmUnsavedChanges: 'There may be unsaved changes. Really quit?',

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
