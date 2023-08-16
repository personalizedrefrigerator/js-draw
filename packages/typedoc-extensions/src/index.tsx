import { Application, JSX, MarkdownEvent, RendererEvent } from 'typedoc';
import { readdirSync, copyFileSync } from 'node:fs';
import * as path from 'node:path';
import transformMarkdown from './transformMarkdown';

export const load = (app: Application) => {
	const distDir = path.dirname(__dirname);

	//app.renderer.defineTheme('custom-theme', CustomTheme);
	app.renderer.on(
		MarkdownEvent.PARSE,
		(event: MarkdownEvent) => {
			event.parsedText = transformMarkdown(event.parsedText);
		},
		null,

		// A positive priority to run before parsing
		// Not specifying this causes the event to run after.
		1
	);

	app.renderer.hooks.on('head.end', (event) => {
		// Additional variable declarations for the browser script
		const pageVariables = `
			window.assetsURL = ${JSON.stringify(event.relativeURL('assets/'))}
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

	app.renderer.on(RendererEvent.END, (event: RendererEvent) => {
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
