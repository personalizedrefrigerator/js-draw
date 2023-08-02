

export interface BundledFileRecord {
	name: string;
	inPath: string;

	// outPath defaults to a path based on inPath
	outPath?: string;
}

export interface TranslationSourcePair {
	// Name of the project
	name: string;

	// JavaScript source file providing the translation source.
	// Each file should have a single default export that contains
	// a map from locale keys (e.g. en for English, es for Español, etc.) to
	// a localization.
	path: string;

	// The key of the default locale (which should have translations for all valid
	// keys).
	defaultLocale: string;
}

export interface BuildConfig {
	bundledFiles: BundledFileRecord[];

	prebuild: {
		// A path to a script to be run just before building
		scriptPath: string;
	}|null;

	translationSourceFiles: TranslationSourcePair[];
	translationDestPath: string;

	inDirectory: string|undefined;
	outDirectory: string|undefined;
}

