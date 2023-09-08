import { matchingLocalizationTable } from 'js-draw';

export interface Localization {
	localStorageSave: string;
	databaseLoadError: string;
	untitledImage: string;

	newImageHeading: string;
	new: string;

	templateLightGrid: string;
	templateDarkGrid: string;

	warningSaveTargetOnlySupportsOneImage: string;

	confirmUnsavedChanges: string;

	advancedOptions: string;
	pasteSVGTextDataHint: string;
	submit: string;

	saveUnsavedChanges: string;

	save: string;
	delete: string;
	reallyDelete: (imageName: string) => string;

	settings: string;
	reset: string,
	keyboardShortcuts: string;
	bindingParseError: (errorMessage: string) => string;

	// Save screen:
	imageTitleLabel: string;
	viewGeneratedSVGImage: string;
	viewGeneratedPNGImage: string;
	previewLabel: string;
	download: string;
	close: string;
	savedAs: (imageName: string) => string;
	imageSize: (imageSize: string) => string;
}

const localizationTables: Record<string, Localization> = { };

localizationTables.en = {
	localStorageSave: 'Local Storage',
	databaseLoadError: 'Database failed to load.',
	untitledImage: 'Untitled Image',

	templateLightGrid: 'Light Grid',
	templateDarkGrid: 'Dark Grid',

	warningSaveTargetOnlySupportsOneImage: 'Warning: On this system, js-draw only supports saving one image. While this image will still be downloadable, you won\'t be able to save it to this website.',

	confirmUnsavedChanges: 'There may be unsaved changes. Really quit?',

	advancedOptions: 'Advanced...',
	pasteSVGTextDataHint: 'Paste SVG text data here',
	submit: 'Submit',

	newImageHeading: 'New Image',
	new: 'New',

	saveUnsavedChanges: 'There may be unsaved changes. Save them?',

	save: 'Save',
	delete: 'Delete',
	reallyDelete: (imageName) => `Are you sure you want to delete ${imageName}?`,

	settings: 'Settings',
	keyboardShortcuts: 'Keyboard Shortcuts',
	reset: 'Reset',
	bindingParseError: (errorMessage: string) => `Error: ${errorMessage}`,

	imageTitleLabel: 'Image title: ',
	viewGeneratedSVGImage: 'View generated SVG image',
	viewGeneratedPNGImage: 'View generated PNG image',
	previewLabel: 'Preview: ',
	download: 'Download',
	close: 'Close',
	savedAs: (imageName: string) => `Saved as ${imageName}.`,
	imageSize: (imageSize: string) => `Image size: ${imageSize}`,
};

localizationTables.es = {
	// Default to English for untranslated strings;
	...localizationTables.en,

	new: 'Nuevo',
	delete: 'Borre',
	reallyDelete: (imageName) => `¿Está seguro que quiere borrar "${imageName}"?`,

	settings: 'Ajustes',

	imageTitleLabel: 'Título: ',
	viewGeneratedSVGImage: 'Ver imagen de SVG',
	viewGeneratedPNGImage: 'Ver imagen de PNG',
	download: 'Descargar',
	close: 'Cerrar',
	savedAs: (imageName: string) => `Guardado con título ${imageName}.`,
	imageSize: (imageSize: string) => `Tamaño de imagen: ${imageSize}`,
};

export const getLocalizationTable = () => {
	return matchingLocalizationTable(navigator.languages, localizationTables, localizationTables.en);
};
