import { matchingLocalizationTable } from "../../src/localizations/getLocalizationTable";

export interface Localization {
    localStorageSave: string;
    databaseLoadError: string;
    untitledImage: string;
}

const localizationTables: Record<string, Localization> = { };

localizationTables.en = {
    localStorageSave: 'Local Storage',
    databaseLoadError: 'Database failed to load.',

    untitledImage: 'Untitled Image',
};

localizationTables.es = {
    // Default to English for untranslated strings;
    ...localizationTables.en,
};

export const getLocalizationTable = () => {
    return matchingLocalizationTable(navigator.languages, localizationTables, localizationTables.en);
};
