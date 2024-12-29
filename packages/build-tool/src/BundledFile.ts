import { dirname, extname, basename, join } from 'path';
import * as esbuild from 'esbuild';
import ScssCompiler from './ScssCompiler';

export default class BundledFile {
	private readonly bundleBaseName: string;
	private readonly rootFileDirectory: string;
	private readonly outputFilepath: string;

	public constructor(
		public readonly bundleName: string,
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

	private makeBuildContext(mode: 'production' | 'development') {
		return esbuild.context({
			entryPoints: [this.sourceFilePath],
			format: 'iife',
			globalName: this.bundleName,
			minify: mode !== 'development',
			treeShaking: mode !== 'development',
			bundle: true,
			outfile: this.outputFilepath,
			plugins: [
				{
					name: 'js-draw__node-polyfills',
					setup(build) {
						build.onResolve({ filter: /^path$/ }, () => {
							return {
								path: require.resolve('path-browserify'),
							};
						});
					},
				},
				{
					name: 'js-draw__scss-builder',
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
		const compiler = await this.makeBuildContext('production');
		await compiler.rebuild();
		await compiler.dispose();
	}

	public async startWatching() {
		const compiler = await this.makeBuildContext('development');
		await compiler.watch();
	}
}
