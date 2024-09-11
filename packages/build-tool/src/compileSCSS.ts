import { BuildConfig, BuildMode } from './types';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import sass from 'sass';

const compileSCSS = async (config: BuildConfig, buildMode: BuildMode) => {
	if (config.scssFiles.length === 0 || !config.inDirectory || !config.outDirectory) {
		return;
	}
	const inDir = config.inDirectory;
	const outDir = config.outDirectory;
	console.log('Compiling SCSS...');

	const compile = async (filePath: string) => {
		const result = await sass.compileAsync(filePath);

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
	};

	type FileChangeListener = () => Promise<void>;
	const fileChangeListeners: Record<string, Array<FileChangeListener>> = Object.create(null);

	await Promise.all(
		config.scssFiles.map(async (filePath) => {
			const dependencies = await compile(filePath);

			if (buildMode === 'watch') {
				for (const depPath of dependencies) {
					fileChangeListeners[depPath] ??= [];
					fileChangeListeners[depPath].push(async () => {
						try {
							// TODO: Update dependency graph.
							await compile(filePath);
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
};

export default compileSCSS;
