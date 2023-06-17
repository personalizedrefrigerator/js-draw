
// See https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API

import path, { dirname } from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';
//import { writeFile } from 'fs/promises';

import forEachFileInDirectory from './forEachFileInDirectory';
import { mkdir, writeFile } from 'fs/promises';

const scriptDir = dirname(__dirname);
const rootDir = dirname(dirname(scriptDir));

type ModuleType = 'mjs'|'cjs';

// Used by TypeScript to format diagnostic messages.
// See https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#writing-an-incremental-program-watcher
const formatHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: filePath => filePath,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

class TranspiledDirectory {
	private rootConfig: Record<string, any>;
	public constructor(private inDir: string, private outDir: string) {
		this.rootConfig = this.getCompilerOptionsFromConfig();
	}

	private async getTargetFiles() {
		// Find all TypeScript files in this.inDir
		const tsFiles: string[] = [];
		await forEachFileInDirectory(this.inDir, async (filePath: string) => {
			if (filePath.endsWith('.ts')) {
				tsFiles.push(filePath);
			}
		});

		return tsFiles;
	}

	private getCompilerOptionsFromConfig(): ts.CompilerOptions {
		const searchPath = './';
		let path = ts.findConfigFile(
			searchPath,
			ts.sys.fileExists,
			'tsconfig.json'
		);

		if (!path) {
			path = ts.findConfigFile(
				rootDir,
				ts.sys.fileExists,
				'tsconfig.json'
			);
		}

		const defaultConfig = {};

		if (path) {
			const config = ts.readConfigFile(path, ts.sys.readFile);
			if (config.error) {
				this.reportDiagnostic(config.error);
				throw new Error('Unable to read config file.');
			}

			const compilerOpts = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, './');
			if (compilerOpts.errors.length > 0) {
				for (const error of compilerOpts.errors) {
					this.reportDiagnostic(error);
				}
				throw new Error('Unable to parse config file.');
			}

			return compilerOpts.options;
		} else {
			console.warn('No tsconfig.json file found!');
			return defaultConfig;
		}
	}

	private reportDiagnostic(diagnostic: ts.Diagnostic) {
		console.error(
			'🛑 Error 🛑',
			diagnostic.code,
			ts.formatDiagnostic(diagnostic, formatHost)
		);
	}

	private filterTranspiledFile(
		moduleType: ModuleType,
		fileRecord: { filePath: string, text: string }
	): { filePath: string, text: string} {
		let { filePath, text } = fileRecord;

		// Don't update .d.ts files
		if (!filePath.endsWith('.js')) {
			return fileRecord;
		}

		if (moduleType === 'mjs') {
			// Rename
			filePath = filePath.replace(/\.js$/, '.mjs');

			// Change imports from
			//   import foo from './bar'
			// to
			//   import foo from './bar.mjs'
			// and exports similarly.

			// TODO: Switch to using the TypeScript compiler API. This has the danger of changing imports
			// in multi-line strings.
			text = text.replace(/([\n]|^)(import|export)(.*)from\s+(['"])(\.*\/[^\n]+)(['"])/g, '$1$2 $3 from $4$5.mjs$6');
		} else {
			// .cjs file. No changes needed.
		}

		return { filePath, text };
	}

	private async runBuild(watch: boolean) {
		// Largely based on
		// https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#incremental-build-support-using-the-language-services
		const fileVersions: ts.MapLike<{ version: number }> = {};
		const targetFiles = await this.getTargetFiles();

		const documentRegistry = ts.createDocumentRegistry();
		const makeLanguageService = (additionalOptions: ts.CompilerOptions) => {
			const options: ts.CompilerOptions = {
				declaration: true,
				...this.rootConfig.compilerOptions,
				...additionalOptions,
			};

			const servicesHost: ts.LanguageServiceHost = {
				getScriptFileNames: () => targetFiles,
				getScriptVersion: filePath => fileVersions[filePath]?.version?.toString(),
				getScriptSnapshot: fileName => {
					if (!fs.existsSync(fileName)) {
						return undefined;
					}

					return ts.ScriptSnapshot.fromString(
						fs.readFileSync(fileName, { encoding: 'utf-8' })
					);
				},
				getCurrentDirectory: () => process.cwd(),
				getCompilationSettings: () => options,
				getDefaultLibFileName: ts.getDefaultLibFilePath,
				fileExists: ts.sys.fileExists,
				readFile: ts.sys.readFile,
				directoryExists: ts.sys.directoryExists,
				getDirectories: ts.sys.getDirectories,
			};

			const services = ts.createLanguageService(servicesHost, documentRegistry);
			return services;
		};

		const langServices: Record<ModuleType, ts.LanguageService> = {
			'mjs': makeLanguageService({
				module: ts.ModuleKind.ES2020,
				outDir: path.join(this.outDir, 'mjs'),
			}),
			'cjs': makeLanguageService({
				module: ts.ModuleKind.CommonJS,
				outDir: path.join(this.outDir, 'cjs'),
			}),
		};

		// Maps from source files to output files
		const associatedFiles: Record<string, string[]> = {};

		const emitFile = async (moduleType: ModuleType, fileName: string) => {
			const languageService = langServices[moduleType];
			const output = languageService.getEmitOutput(fileName);

			// Errors?
			if (output.emitSkipped) {
				console.error(`💥 Failed to transpile ${fileName} 💥`);
				const diagnostics = languageService
					.getCompilerOptionsDiagnostics()
					.concat(languageService.getSyntacticDiagnostics(fileName))
					.concat(languageService.getSemanticDiagnostics(fileName));

				diagnostics.forEach(this.reportDiagnostic.bind(this));
			}

			const writeFilePromises = output.outputFiles.map(async (outFile) => {
				const text = outFile.text;
				const outPath = outFile.name;

				// Skip outputting .test.js files
				if (outPath.endsWith('test.js')) {
					return;
				}

				const outRecord = this.filterTranspiledFile(moduleType, { filePath: outPath, text: text });
				associatedFiles[fileName].push(outRecord.filePath);

				const outDirectory = dirname(outRecord.filePath);
				if (!fs.existsSync(outDirectory)) {
					await mkdir(outDirectory, { recursive: true });
				}

				await writeFile(outRecord.filePath, outRecord.text, 'utf-8');
			});

			await Promise.all(writeFilePromises);
		};

		// Emit all files
		const emitFilePromises = [];
		for (const fileName of targetFiles) {
			associatedFiles[fileName] = [];
			emitFilePromises.push(emitFile('cjs', fileName));
			emitFilePromises.push(emitFile('mjs', fileName));
		}
		await Promise.all(emitFilePromises);

		if (watch) {
			// Maps from file paths to whether that file is being processed
			const updatingFile: Record<string, boolean> = {};
			const postUpdateFile: Record<string, ()=>Promise<void>> = {};

			if (!ts.sys.watchDirectory) {
				throw new Error('ts.sys.watchDirectory is null. (Unsupported on the current platform?)');
			}

			const recursive = true;
			const watcher = ts.sys.watchDirectory(this.inDir, async (fileName) => {
				console.log(`Watcher: ${fileName} updated`);

				const updateFile = async () => {
					if (fs.existsSync(fileName)) {
						associatedFiles[fileName] = [];
						try {
							updatingFile[fileName] = true;
							await emitFile('cjs', fileName);
							await emitFile('mjs', fileName);
						} finally {
							updatingFile[fileName] = false;
						}

						if (postUpdateFile[fileName]) {
							void postUpdateFile[fileName]();
							delete postUpdateFile[fileName];
						}
					} else {
						for (const path of associatedFiles[fileName] ?? []) {
							fs.unlinkSync(path);
						}
					}
				};

				if (updatingFile[fileName]) {
					postUpdateFile[fileName] = updateFile;
				} else {
					updateFile();
				}
			}, recursive);

			return {
				stop() {
					watcher.close();
				}
			};
		}

		return null;
	}

	public watch() {
		return this.runBuild(true);
	}

	public build() {
		return this.runBuild(false);
	}
}

export default TranspiledDirectory;