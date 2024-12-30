import { rename, readFile, writeFile, unlink } from 'fs/promises';
import forEachFileInDirectory from './forEachFileInDirectory';

// Script to be run after building JavaScript files from TypeScript.
// TODO: This is very hacky.
// TODO: [Use the TypeScript Compiler API instead.](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

const removeFiles = async (directory: string, filePattern: RegExp) => {
	await forEachFileInDirectory(directory, async (filePath: string) => {
		if (!filePath.match(filePattern)) {
			return;
		}

		await unlink(filePath);
	});
};

const filterTranspiledDirectory = async (directoryPath: string) => {
	const cjsPath = `${directoryPath}/cjs`;
	const mjsPath = `${directoryPath}/mjs`;

	const testPattern = /\.test\.js$/;
	await removeFiles(cjsPath, testPattern);
	await removeFiles(mjsPath, testPattern);

	// We need to replace imports in ESM files.
	await forEachFileInDirectory(mjsPath, async (filePath: string) => {
		if (!filePath.endsWith('.js')) {
			return;
		}

		// Rename
		const newPath = filePath.replace(/\.js$/, '.mjs');
		await rename(filePath, newPath);

		// Change imports from
		//   import foo from './bar'
		// to
		//   import foo from './bar.mjs'
		// and exports similarly.
		let contents = await readFile(newPath, { encoding: 'utf-8' });

		// TODO: Switch to using the TypeScript compiler API. This has the danger of changing imports
		// in multi-line strings.
		contents = contents.replace(
			/([\n]|^)(import|export)(.*)from\s+(['"])(\.*\/[^\n]+)(['"])/g,
			'$1$2 $3 from $4$5.mjs$6',
		);

		await writeFile(newPath, contents);
	});
};

export default filterTranspiledDirectory;
