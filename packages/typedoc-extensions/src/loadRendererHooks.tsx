import { Renderer, JSX, MarkdownEvent, RendererEvent, Options } from 'typedoc';
import { readdirSync, copyFileSync } from 'node:fs';
import * as path from 'node:path';
import transformMarkdown from './transformMarkdown';
import DoctestHandler from './DoctestHandler';

const loadRendererHooks = (renderer: Renderer, options: Options) => {
	const distDir = path.dirname(__dirname);

	const doctestHandler = new DoctestHandler();
	renderer.on(MarkdownEvent.PARSE, (event: MarkdownEvent) => {
		event.parsedText = transformMarkdown(event.parsedText, {
			addDoctest: (doctestHtml) => {
				doctestHandler.addDoctestFromEvent(doctestHtml, event);
			},
			resolveIncludePath: (targetPath) => {
				const baseIncludeDir = options.getValue('includeBaseDirectory');
				// Includes not supported
				if (!baseIncludeDir || typeof baseIncludeDir !== 'string') {
					return null;
				}

				// Without an appended path.sep,
				const resolvedBaseIncludeDir = path.resolve(path.join(baseIncludeDir, path.sep));
				const resolvedTarget = path.resolve(resolvedBaseIncludeDir, targetPath);

				// Verify that the target path is actually in the base directory.
				if (!resolvedTarget.startsWith(resolvedBaseIncludeDir)) {
					console.warn(
						`Include resolution failure: !${JSON.stringify(resolvedTarget)}.startsWith(${JSON.stringify(resolvedBaseIncludeDir)}).startsWith(${JSON.stringify(resolvedTarget)})`,
					);
					return null;
				}

				return resolvedTarget;
			},
		});
	});

	renderer.hooks.on('head.end', (event) => {
		// Additional variable declarations for the browser script
		const pageVariables = `
			window.basePath = ${JSON.stringify(event.relativeURL('.'))}
			window.assetsURL = ${JSON.stringify(event.relativeURL('assets/'))};
			window.imagesURL = ${JSON.stringify(event.relativeURL('../img/'))};

			/* Needed for TypeScript compilation */
			window.process ??= { versions: {} };
		`;

		return (
			<>
				<script>
					<JSX.Raw html={pageVariables} />
				</script>
				<script src={event.relativeURL('assets/js-draw-typedoc-extension--browser.js')}></script>
			</>
		);
	});

	renderer.hooks.on('body.end', (event) => {
		return (
			<>
				<a style='float: right;' href={event.relativeURL('assets/licenses.txt')}>
					OpenSource licenses
				</a>
			</>
		);
	});

	renderer.on(RendererEvent.END, (event: RendererEvent) => {
		const doctestFilename = 'doctest.html';
		doctestHandler.render(path.join(distDir, doctestFilename));

		const filesToCopy = [
			'js-draw-typedoc-extension--browser.js',
			'js-draw-typedoc-extension--iframe.js',
			doctestFilename,
			'licenses.txt',
		].map((fileName) => path.resolve(distDir, fileName));

		// Copy fonts
		for (const fileName of readdirSync(distDir)) {
			if (fileName.endsWith('.woff') || fileName.endsWith('.woff2') || fileName.endsWith('.ttf')) {
				filesToCopy.push(path.resolve(distDir, fileName));
			}
		}

		for (const filePath of filesToCopy) {
			const targetPath = path.join(
				event.outputDirectory,
				'assets',
				path.relative(distDir, filePath),
			);
			copyFileSync(filePath, targetPath);
		}
	});
};

export default loadRendererHooks;
