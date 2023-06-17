#!/usr/bin/env ts-node
import { argv, exit } from 'node:process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import TranspiledDirectory from './TranspiledDirectory';
import BundledFile from './BundledFile';

interface BundledFileRecord {
    name: string;
    inPath: string;
    outPath: string;
}

interface Config {
    bundledFiles: BundledFileRecord[];
    inDirectory: string|undefined;
    outDirectory: string|undefined;
}

type BuildMode = 'build'|'watch';

const isBuildMode = (a: string): a is BuildMode => {
	return a === 'build' || a === 'watch';
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
const readConfig = (): Config => {
	const configFile = readFileSync('./build-config.json', { encoding: 'utf-8' });
	const config = JSON.parse(configFile);

	const bundledFiles: BundledFileRecord[] = [];
	if ('bundledFiles' in config) {
		if (typeof (config.bundledFiles) !== 'object' || !('length' in config.bundledFiles)) {
			throw new Error('readConfig: bundledFiles property must be an array!');
		}

		for (const filePair of config.bundledFiles) {
			const errorContext = 'readConfig, reading an item in bundledFiles';

			if (!('inPath' in filePair) || !('outPath' in filePair)) {
				throw new Error(errorContext + ': inPath and outPath must be keys of each bundled file.');
			}

			if (typeof (filePair.inPath) !== 'string' || typeof (filePair.outPath) !== 'string') {
				throw new Error(errorContext + ': inPath and outPath must both be strings');
			}

			if (typeof (filePair.name) !== 'string') {
				throw new Error(errorContext + ': filePair.name must be a string');
			}

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
		if (typeof (config.inDirectory) !== 'string' || (('outDirectory' in config) && typeof (config.outDirectory) !== 'string')) {
			throw new Error('readConfig: inDirectory and outDirectory must be strings or undefined');
		}

		inDirectory = config.inDirectory;
		outDirectory = config.outDirectory ?? './dist/';
	}

	return {
		inDirectory: inDirectory ? path.resolve(inDirectory) : undefined,
		outDirectory: outDirectory ? path.resolve(outDirectory) : undefined,

		bundledFiles
	};
};

if (argv.length === 1) {
	printUsage();
	console.error(`ERROR: ${argv[0]} requires at least 1 argument.`);
	exit(1);
}

let buildMode = argv[1];
// If not a build mode, we may be running with `ts-node path/to/thing.ts command`.
// skip to the next argument.
if (!isBuildMode(buildMode)) {
	buildMode = argv[2];
}

if (!isBuildMode(buildMode)) {
	console.warn('build mode: ', buildMode);
	throw new Error('argv[1] must be either build or watch');
}


const bundleFiles = async (config: Config) => {
	for (const { name, inPath, outPath } of config.bundledFiles) {
		const bundledFile = new BundledFile(name, inPath, outPath);

		if (buildMode === 'build') {
			await bundledFile.build();
		} else {
			bundledFile.startWatching();
		}
	}
};

const transpileDirectory = async (inDir: string, outDir: string) => {
	const transpiledDirectory = new TranspiledDirectory(inDir, outDir);

	if (buildMode === 'build') {
		await transpiledDirectory.build();
	} else {
		transpiledDirectory.watch();
	}
};


const config = readConfig();
console.log('config.outDir', config.outDirectory);

void bundleFiles(config);

if (config.inDirectory && config.outDirectory) {
	void transpileDirectory(config.inDirectory, config.outDirectory);
}

