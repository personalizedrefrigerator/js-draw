import { BuildConfig, BuildMode } from './types';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import sass from 'sass';

interface CacheEntry {
	result: Promise<sass.CompileResult>;
}

export default class ScssCompiler {
	private cache: Map<string, CacheEntry> = new Map();
	private cacheEnabled: boolean = false;

	public constructor(
		private config: BuildConfig,
		private buildMode: BuildMode,
	) {
		// In build mode, we expect file content to be constant. In this case,
		// it's okay to cache file content. In watch mode, files can change, which
		// is not properly handled by the current caching logic.
		this.cacheEnabled = buildMode === 'build';
	}

	public async compile(sourcePath: string) {
		sourcePath = path.resolve(sourcePath);

		const cacheEntry = this.cache.get(sourcePath);
		if (this.cacheEnabled && cacheEntry) {
			return cacheEntry.result;
		}

		const result = sass.compileAsync(sourcePath, {
			style: this.buildMode === 'watch' ? 'expanded' : 'compressed',
		});
		this.cache.set(sourcePath, {
			result,
		});
		return result;
	}

	private async compileAndWrite(filePath: string) {
		const inDir = this.config.inDirectory;
		const outDir = this.config.outDirectory;

		if (!inDir || !outDir) {
			throw new Error('compileAndWrite requires inDir and outDir');
		}

		const result = await this.compile(filePath);

		const targetPath = path.relative(inDir, filePath);
		const outputPath = path.join(outDir, targetPath).replace(/[.]s[ca]ss$/, '.css');

		if (!outputPath.endsWith('.css')) {
			throw new Error('Invalid SCSS file extension');
		}

		const outputParentDir = path.dirname(outputPath);

		console.log('[…] Writing compiled SCSS file', filePath, 'to', outputPath);

		await fs.mkdir(outputParentDir, { recursive: true });
		await fs.writeFile(outputPath, result.css, 'utf-8');

		const dependencies = result.loadedUrls
			.map((url) => {
				const dependencyPath = url.pathname ? path.resolve(url.pathname) : null;
				if (dependencyPath && dependencyPath.startsWith(inDir)) {
					return dependencyPath;
				}

				return null;
			})
			.filter((depPath) => depPath !== null);

		return dependencies;
	}

	public async start() {
		const config = this.config;
		if (config.scssFiles.length === 0 || !config.inDirectory || !config.outDirectory) {
			return;
		}
		console.log('Compiling SCSS...');

		type FileChangeListener = () => Promise<void>;
		const fileChangeListeners: Record<string, Array<FileChangeListener>> = Object.create(null);

		await Promise.all(
			config.scssFiles.map(async (filePath) => {
				const dependencies = await this.compileAndWrite(filePath);

				if (this.buildMode === 'watch') {
					for (const depPath of dependencies) {
						fileChangeListeners[depPath] ??= [];
						fileChangeListeners[depPath].push(async () => {
							try {
								// TODO: Update dependency graph.
								await this.compileAndWrite(filePath);
							} catch (error) {
								console.error(error);
							}
						});
					}
				}
			}),
		);

		// Watch and trigger listeners
		await Promise.all(
			Object.keys(fileChangeListeners).map(async (filePath) => {
				let compiling = false;
				for await (const event of fs.watch(filePath)) {
					if (event.eventType === 'rename') {
						console.log('SCSS watcher: File renamed: ', filePath);
						console.warn(
							"Warning: The SCSS watcher doesn't support renaming files. Please restart the watcher",
						);
						continue;
					}

					// Don't run multiple compilations at the same time on the same
					// file.
					if (compiling) {
						continue;
					}

					console.log('SCSS watcher: File changed: ', filePath);

					compiling = true;
					fileChangeListeners[filePath].forEach(async (listener) => {
						try {
							await listener();
						} finally {
							compiling = false;
						}
					});
				}
			}),
		);
	}
}
