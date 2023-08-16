

import {
	ScriptTarget, ModuleKind, CompilerOptions, LanguageServiceHost, createLanguageService, ScriptSnapshot
} from 'typescript';
import { resolve } from 'path';



const compilerOptions: CompilerOptions = {
	noEmitOnError: false,
	target: ScriptTarget.ESNext,
	module: ModuleKind.CommonJS,
};

/**
 * Converts TypeScript to runnable JavaScript.
 */
const typeScriptToJS = (source: string) => {
	const cwd = '/';
	const rootFileName = './index.ts';
	const files = {
		[resolve(cwd, rootFileName)]: source,
	};

	const directoryExists = (dirPath: string) => {
		return resolve(cwd, dirPath) === '/';
	};

	const fileExists = (filePath: string) => {
		return resolve(cwd, filePath) in files;
	};

	// See https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
	const servicesHost: LanguageServiceHost = {
		getScriptFileNames: () => ['./index.ts'],
		getScriptVersion: _script => '1',
		getScriptSnapshot: fileName => {
			if (!fileExists(fileName)) return undefined;

			return ScriptSnapshot.fromString(files[resolve(cwd, fileName)]);
		},
		getCompilationSettings: () => {
			return compilerOptions;
		},


		fileExists,
		readFile: fileName => {
			if (fileExists(fileName)) {
				return files[resolve(cwd, fileName)];
			}
			return undefined;
		},
		getCurrentDirectory: () => cwd,
		readDirectory: dirPath => directoryExists(dirPath) ? Object.values(files) : [],
		directoryExists,
		getDefaultLibFileName: () => './index.ts',
	};

	const services = createLanguageService(servicesHost);
	const output = services.getEmitOutput(rootFileName);

	// Return the first JavaScript file
	const outputJS = output.outputFiles
		.filter(file => file.name.endsWith('.js'))
		.map(file => file.text);
	return outputJS[0];
};

export default typeScriptToJS;
