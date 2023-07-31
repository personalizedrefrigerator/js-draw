import { Application, JSX, MarkdownEvent } from 'typedoc';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import transformMarkdown from './transformMarkdown';

export const load = (app: Application) => {
	const distDir = path.dirname(__dirname);
	const browserJS = readFileSync(path.join(distDir, 'browser.js'), 'utf-8');

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

	app.renderer.hooks.on('head.end', () => (
		<script>
			<JSX.Raw html={browserJS}/>
		</script>
	));
};
