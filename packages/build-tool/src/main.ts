#!/usr/bin/env ts-node
import { argv, exit } from 'node:process';
import path from 'node:path';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import TranspiledDirectory from './TranspiledDirectory';
import BundledFile from './BundledFile';
import buildTranslationTemplates from './buildTranslationTemplates';
import { BuildConfig, BundledFileRecord, TranslationSourcePair } from './types';

type BuildMode = 'build'|'watch';
type BuildCommand = BuildMode|'build-translation-template';

// TODO: These currently assume that build-tool is private to js-draw.
const scriptDir = realpathSync(path.resolve(__dirname));
const buildToolDir = path.dirname(scriptDir);
const rootDir = path.dirname(path.dirname(buildToolDir));

const isBuildMode = (a: string): a is BuildMode => {
	return a === 'build' || a === 'watch';
};

const isBuildCommand = (a: string): a is BuildCommand => {
	return isBuildMode(a) || a === 'build-translation-template';
};

const printUsage = () => {
	console.log(`Usage: ${argv[0]} build|watch`);
	console.log();
	console.log(
		'Both build and watch read from a build-config.json in the ' +
        'current directory.'
	);
};

/** Reads the build configuration from `./build-config.json`. */
const readConfig = (): BuildConfig => {
	const configFile = readFileSync('./build-config.json', { encoding: 'utf-8' });
	const config = JSON.parse(configFile);

	const assertIsArray = (container: any, propertyName: string, details: string = '') => {
		if (typeof (container[propertyName]) !== 'object' || !('length' in container[propertyName])) {
			throw new Error(`readConfig: ${propertyName} is not an array. ${details}`);
		}
	};

	const assertPropertyHasType = (object: any, propertyName: string, expectedType: string, context: string = '') => {
		if (typeof (object[propertyName]) !== expectedType) {
			throw new Error(context + ` Expected ${propertyName} to have type ${expectedType}.`);
		}
	};

	const bundledFiles: BundledFileRecord[] = [];
	if ('bundledFiles' in config) {
		assertIsArray(config, 'bundledFiles');

		for (const filePair of config.bundledFiles) {
			const errorContext = 'readConfig, reading an item in bundledFiles';

			assertPropertyHasType(filePair, 'inPath', 'string', errorContext);
			assertPropertyHasType(filePair, 'outPath', 'string', errorContext);
			assertPropertyHasType(filePair, 'name', 'string', errorContext);

			bundledFiles.push({
				inPath: path.resolve(filePair.inPath),
				outPath: path.resolve(filePair.outPath),
				name: filePair.name,
			});
		}
	}

	let inDirectory: string|undefined = undefined;
	let outDirectory: string|undefined = undefined;
	if ('inDirectory' in config) {
		assertPropertyHasType(config, 'inDirectory', 'string', 'readConfig');
		if (config.outDirectory) {
			assertPropertyHasType(config, 'outDirectory', 'string', 'readConfig');
		}

		inDirectory = config.inDirectory;
		outDirectory = config.outDirectory ?? './dist/';
	}

	const translationSourceFiles: TranslationSourcePair[] = [];
	if ('translationSourceFiles' in config) {
		assertIsArray(config, 'translationSourceFiles');

		for (const translationSourceData of config.translationSourceFiles) {
			assertPropertyHasType(translationSourceData, 'name', 'string');
			assertPropertyHasType(translationSourceData, 'path', 'string');
			assertPropertyHasType(translationSourceData, 'defaultLocale', 'string');

			const translationSourcePath = translationSourceData.path;
			const projectName = translationSourceData.name;

			if (!existsSync(translationSourcePath)) {
				throw new Error('readConfig: Expected translationSourcePath to be a path that exists.');
			}

			translationSourceFiles.push({
				name: projectName,
				path: path.resolve(translationSourcePath),
				defaultLocale: translationSourceData.defaultLocale,
			});
		}
	}

	let translationDestPath = path.join(rootDir, '.github/ISSUE_TEMPLATE');
	if ('translationDestPath' in config) {
		if (typeof (config.translationDestPath) !== 'string') {
			throw new Error('config.translationDestPath is not a string');
		}

		if (!existsSync(config.translationDestPath)) {
			throw new Error('config.translationDestPath does not exist');
		}

		translationDestPath = path.resolve(config.translationDestPath);
	}

	return {
		inDirectory: inDirectory ? path.resolve(inDirectory) : undefined,
		outDirectory: outDirectory ? path.resolve(outDirectory) : undefined,
		translationSourceFiles,
		translationDestPath,

		bundledFiles,
	};
};

const bundleFiles = async (config: BuildConfig, buildMode: BuildMode) => {
	for (const { name, inPath, outPath } of config.bundledFiles) {
		const bundledFile = new BundledFile(name, inPath, outPath);

		if (buildMode === 'build') {
			await bundledFile.build();
		} else {
			bundledFile.startWatching();
		}
	}
};

const transpileDirectory = async (inDir: string, outDir: string, buildMode: BuildMode) => {
	const transpiledDirectory = new TranspiledDirectory(inDir, outDir);

	if (buildMode === 'build') {
		await transpiledDirectory.build();
	} else {
		transpiledDirectory.watch();
	}
};

if (argv.length === 1) {
	printUsage();
	console.error(`ERROR: ${argv[0]} requires at least 1 argument.`);
	exit(1);
}

let buildMode = argv[1];
// If not a build mode, we may be running with `ts-node path/to/thing.ts command`.
// skip to the next argument.
if (!isBuildCommand(buildMode)) {
	buildMode = argv[2];
}

if (!isBuildCommand(buildMode)) {
	console.warn('build mode: ', buildMode);
	throw new Error('argv[1] must be either build or watch');
}

const config = readConfig();
if (buildMode === 'build-translation-template') {
	console.log('Building translation templates...');
	buildTranslationTemplates(config);
} else {
	void bundleFiles(config, buildMode);

	if (config.inDirectory && config.outDirectory) {
		void transpileDirectory(config.inDirectory, config.outDirectory, buildMode);
	}
}


