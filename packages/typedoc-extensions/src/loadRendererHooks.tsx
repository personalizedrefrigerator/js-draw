import { Renderer, JSX, MarkdownEvent, RendererEvent } from 'typedoc';
import { readdirSync, copyFileSync } from 'node:fs';
import * as path from 'node:path';
import transformMarkdown from './transformMarkdown';
import DoctestHandler from './DoctestHandler';

const loadRendererHooks = (renderer: Renderer) => {
	const distDir = path.dirname(__dirname);

	const doctestHandler = new DoctestHandler();
	renderer.on(
		MarkdownEvent.PARSE,
		(event: MarkdownEvent) => {
			event.parsedText = transformMarkdown(
				event.parsedText,
				{
					addDoctest: (doctestHtml) => {
						doctestHandler.addDoctestFromEvent(doctestHtml, event);
					},
				}
			);
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

	renderer.hooks.on('body.end', (event) => {
		return (
			<>
				<a style="float: right;" href={event.relativeURL('assets/licenses.txt')}>
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
