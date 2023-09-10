import { Renderer, JSX, MarkdownEvent, RendererEvent, Options } from 'typedoc';
import { readdirSync, copyFileSync } from 'node:fs';
import * as path from 'node:path';
import transformMarkdown from './transformMarkdown';

const loadRendererHooks = (renderer: Renderer, options: Options) => {
	const distDir = path.dirname(__dirname);

	renderer.on(
		MarkdownEvent.PARSE,
		(event: MarkdownEvent) => {
			event.parsedText = transformMarkdown(event.parsedText);
		},
		null,

		// A positive priority to run before parsing
		// Not specifying this causes the event to run after.
		1,
	);

	renderer.hooks.on('head.end', (event) => {
		// Additional variable declarations for the browser script
		const pageVariables = `
			window.basePath = ${JSON.stringify(event.relativeURL('.'))}
			window.assetsURL = ${JSON.stringify(event.relativeURL('assets/'))};
			window.imagesURL = ${JSON.stringify(event.relativeURL('../img/'))};
		`;

		return (
			<>
				<script>
					<JSX.Raw html={pageVariables}/>
				</script>
				<script src={event.relativeURL('assets/js-draw-typedoc-extension--browser.js')}></script>
			</>
		);
	});

	renderer.on(RendererEvent.END, (event: RendererEvent) => {
		const filesToCopy = [
			'js-draw-typedoc-extension--browser.js',
			'js-draw-typedoc-extension--iframe.js',
		].map(fileName => path.resolve(distDir, fileName));

		// Copy fonts
		for (const fileName of readdirSync(distDir)) {
			if (fileName.endsWith('.woff') || fileName.endsWith('.woff2') || fileName.endsWith('.ttf')) {
				filesToCopy.push(path.resolve(distDir, fileName));
			}
		}

		for (const filePath of filesToCopy) {
			const targetPath = path.join(event.outputDirectory, 'assets', path.relative(distDir, filePath));
			copyFileSync(filePath, targetPath);
		}
	});
};

export default loadRendererHooks;
