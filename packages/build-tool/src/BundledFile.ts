// This file is taken from Joplin: https://github.com/laurent22/joplin
// js-draw was originally created as a part of a pull request for joplin. This
// is part of the functionality from Joplin it requires.

import { dirname, extname, basename } from 'path';
import TerserPlugin from 'terser-webpack-plugin';

import webpack from 'webpack';

export default class BundledFile {
	private readonly bundleBaseName: string;
	private readonly rootFileDirectory: string;
	private readonly outputDirectory: string;
	private readonly outputFilename: string;

	public constructor(
		public readonly bundleName: string,
		private readonly sourceFilePath: string,
		outputFilepath?: string,
	) {
		this.rootFileDirectory = dirname(sourceFilePath);
		this.bundleBaseName = basename(sourceFilePath, extname(sourceFilePath));

		if (outputFilepath) {
			this.outputDirectory = dirname(outputFilepath);
			this.outputFilename = basename(outputFilepath);
		} else {
			this.outputDirectory = this.rootFileDirectory;
			this.outputFilename = `${this.bundleBaseName}.bundle.js`;
		}
	}

	private getWebpackOptions(mode: 'production' | 'development'): webpack.Configuration {
		const config: webpack.Configuration = {
			mode,
			entry: this.sourceFilePath,
			output: {
				path: this.outputDirectory,
				filename: this.outputFilename,

				library: {
					type: 'window',
					name: this.bundleName,
				},
			},
			// See https://webpack.js.org/guides/typescript/
			module: {
				rules: [
					{
						// Include .tsx to include react components
						test: /\.tsx?$/i,
						use: 'ts-loader',
						exclude: /node_modules/,
					},
					{
						test: /\.css$/i,
						use: ['style-loader', 'css-loader'],
					},
					{
						test: /\.scss$/i,
						use: ['style-loader', 'css-loader', 'sass-loader'],
					},
					{
						test: /\.svg$/,
						type: 'asset/inline',
					},
				],

				// Prevent warnings if the TypeScript library is being included.
				// See https://github.com/microsoft/TypeScript/issues/39436#issuecomment-817029140
				noParse: [require.resolve('typescript/lib/typescript.js')],
			},
			optimization: {
				minimizer: [
					// Don't create separate files for comments.
					// See https://stackoverflow.com/a/65650316/17055750
					new TerserPlugin({
						extractComments: false,
					}),
				],
			},
			// Increase the minimum size required
			// to trigger warnings.
			// See https://stackoverflow.com/a/53517149/17055750
			performance: {
				maxAssetSize: 2_000_000, // 2-ish MiB
				maxEntrypointSize: 2_000_000,
			},
			resolve: {
				extensions: ['.tsx', '.ts', '.js'],

				// Allow using the NodeJS path module in generated JS
				fallback: {
					path: require.resolve('path-browserify'),
				},
			},
		};

		return config;
	}

	private handleErrors(err: Error | undefined | null, stats: webpack.Stats | undefined): boolean {
		let failed = false;

		if (err) {
			console.error(`Error: ${err.name}`, err.message, err.stack);
			failed = true;
		} else if (stats?.hasErrors() || stats?.hasWarnings()) {
			const data = stats.toJson();

			if (data.warnings && data.warningsCount) {
				console.warn('Warnings: ', data.warningsCount);
				for (const warning of data.warnings) {
					// Stack contains the message
					if (warning.stack) {
						console.warn(warning.stack);
					} else {
						console.warn(warning.message);
					}
				}
			}
			if (data.errors && data.errorsCount) {
				console.error('Errors: ', data.errorsCount);
				for (const error of data.errors) {
					if (error.stack) {
						console.error(error.stack);
					} else {
						console.error(error.message);
					}
					console.error();
				}

				failed = true;
			}
		}

		return failed;
	}

	// Create a minified JS file in the same directory as `this.sourceFilePath` with
	// the same name.
	public build() {
		const compiler = webpack(this.getWebpackOptions('production'));
		return new Promise<void>((resolve, reject) => {
			console.info(`Building bundle: ${this.bundleName}...`);

			compiler.run((err, stats) => {
				let failed = this.handleErrors(err, stats);

				// Clean up.
				compiler.close(async (error) => {
					if (error) {
						console.error('Error cleaning up:', error);
						failed = true;
					}
					if (!failed) {
						console.log('☑ Done building! ☑');
						resolve();
					} else {
						// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
						reject(error);
					}
				});
			});
		});
	}

	public startWatching() {
		const compiler = webpack(this.getWebpackOptions('development'));
		const watchOptions = {
			followSymlinks: true,
			ignored: ['node_modules/'],
		};

		console.info('Watching bundle: ', this.bundleName);
		compiler.watch(watchOptions, async (err, stats) => {
			const failed = this.handleErrors(err, stats);
			if (!failed) {
				console.log('☑ Built! ☑');
			}
		});
	}
}
