import { dirname, extname, basename, join, resolve } from 'path';
import * as esbuild from 'esbuild';
import ScssCompiler from './ScssCompiler';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import regexEscape from './utils/regexEscape';

enum Mode {
	Development = 'development',
	Production = 'production',
}

export default class BundledFile {
	private readonly bundleBaseName: string;
	private readonly rootFileDirectory: string;
	private readonly outputFilepath: string;

	public constructor(
		public readonly bundleName: string | undefined,
		private readonly sourceFilePath: string,
		outputFilepath: string | undefined,
		private readonly scssCompiler: ScssCompiler,
	) {
		this.rootFileDirectory = dirname(sourceFilePath);
		this.bundleBaseName = basename(sourceFilePath, extname(sourceFilePath));

		if (outputFilepath) {
			this.outputFilepath = outputFilepath;
		} else {
			this.outputFilepath = join(this.rootFileDirectory, `${this.bundleBaseName}.bundle.js`);
		}
	}

	/**
	 * Creates import aliases that improve development experience when running `watch`.
	 *
	 * These aliases allow `watch` to check for changes in dependencies' source files
	 * without also running a version of `watch` in those dependencies.
	 */
	private async createTsImportAliases(mode: Mode): Promise<Map<string, string>> {
		if (mode === Mode.Production) return new Map();

		const tsAliases = new Map<string, string>();

		const packagesDir = dirname(dirname(__dirname));
		for (const packageFolderName of await fs.readdir(packagesDir)) {
			const packagePath = join(packagesDir, packageFolderName);
			const packageJsonPath = join(packagePath, 'package.json');
			const stats = await fs.stat(packagePath);

			if (stats.isDirectory() && existsSync(packageJsonPath)) {
				const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
				let devEntrypoint = packageJson['devel-entrypoint'] ?? join(packagePath, 'src', 'lib.ts');
				devEntrypoint = resolve(packagePath, devEntrypoint);
				if (existsSync(devEntrypoint)) {
					tsAliases.set(packageJson.name, devEntrypoint);
				}
			}
		}

		return tsAliases;
	}

	private async makeBuildContext(mode: Mode) {
		const tsAliases = await this.createTsImportAliases(mode);
		const productionMode = mode === Mode.Production;

		return esbuild.context({
			entryPoints: [this.sourceFilePath],
			format: 'iife',
			globalName: this.bundleName,
			minify: productionMode,
			treeShaking: productionMode,
			bundle: true,
			outfile: this.outputFilepath,
			alias: {
				path: require.resolve('path-browserify'),
			},
			plugins: [
				{
					name: 'js-draw__build-timer',
					setup: (build) => {
						let lastStartTime = 0;
						build.onStart(() => {
							lastStartTime = performance.now();
						});
						build.onEnd(() => {
							console.info(`Bundle finished in ${Math.ceil(performance.now() - lastStartTime)}ms!`);
						});
					},
				},
				{
					// Remaps imports from TypeScript files for improved performance.
					name: 'js-draw__typescript_import_remapper',
					setup: (build) => {
						if (tsAliases.size === 0) return;

						const regexParts = [];
						for (const key of tsAliases.keys()) {
							regexParts.push(regexEscape(key) + '/?');
						}

						const filter = new RegExp(`^(${regexParts.join('|')})$`);
						build.onResolve({ filter }, (args) => {
							if (!args.importer.endsWith('.ts')) return null;
							if (tsAliases.has(args.path)) {
								return { path: tsAliases.get(args.path) };
							}
							return null;
						});
					},
				},
				{
					name: 'js-draw__scss-builder-and-embedder',
					setup: (build) => {
						build.onLoad({ filter: /\.s?css$/ }, async (args) => {
							const result = await this.scssCompiler.compile(args.path);
							return {
								contents: `
									/* ${JSON.stringify(args.path)} */
									(() => {
										if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
											const style = document.createElement('style');
											style.textContent = ${JSON.stringify(result.css)};
											document.head.appendChild(style);
										}
									})();
								`,
								watchFiles: result.loadedUrls
									.filter((url) => url.protocol === 'file:' && url.pathname)
									.map((url) => url.pathname),
								loader: 'js',
							};
						});
					},
				},
			],
		});
	}

	// Create a minified JS file in the same directory as `this.sourceFilePath` with
	// the same name.
	public async build() {
		console.info(`Building bundle: ${this.bundleName}...`);
		const compiler = await this.makeBuildContext(Mode.Production);
		await compiler.rebuild();
		await compiler.dispose();
	}

	public async startWatching() {
		console.info(`Watching bundle: ${this.bundleName}...`);
		const compiler = await this.makeBuildContext(Mode.Development);
		await compiler.watch();
	}
}
