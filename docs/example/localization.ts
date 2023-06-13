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

	confirmUnsavedChanges: 'There may be unsaved changes. Really quit?',

	newImageHeading: 'New Image',
	new: 'New',

	save: 'Save',
	delete: 'Delete',
	reallyDelete: (imageName) => `Are you sure you want to delete ${imageName}?`,

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
	save: 'Guarde',
	delete: 'Borre',
	reallyDelete: (imageName) => `¿Está seguro que quiere borrar "${imageName}"?`,

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
