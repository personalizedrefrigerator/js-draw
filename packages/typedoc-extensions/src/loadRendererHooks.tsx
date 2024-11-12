import { Renderer, JSX, MarkdownEvent, RendererEvent, Options } from 'typedoc';
import { readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import * as posixPath from 'node:path/posix';
import transformMarkdown from './transformMarkdown';
import DoctestHandler from './DoctestHandler';
import htmlEscape from './markdown/htmlEscape';

const loadRendererHooks = (renderer: Renderer, options: Options) => {
	const distDir = path.dirname(__dirname);

	const doctestHandler = new DoctestHandler();
	renderer.on(
		MarkdownEvent.PARSE,
		(event: MarkdownEvent) => {
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
		},
		999999,
	);

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

	const buildDoctestPage = (outputDir: string) => {
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
			const targetPath = path.join(outputDir, 'assets', path.relative(distDir, filePath));
			copyFileSync(filePath, targetPath);
		}
	};

	const buildRedirects = (outputBaseDir: string) => {
		const redirects = options.getValue('redirects') as Record<string, string>;
		for (const [fromPath, toPath] of Object.entries(redirects)) {
			const targetPath = posixPath.relative(posixPath.dirname(fromPath), toPath);
			const linkTargetHtml = htmlEscape(targetPath);

			const redirectPageContent = `
				<!DOCTYPE html>
				<html>
					<head>
						<title>Redirecting...</title>
					</head>
					<body>
						Redirecting to <a href="${linkTargetHtml}" id="redirect-link">${linkTargetHtml}.</a>
						<script>
							location.replace(${JSON.stringify(linkTargetHtml)});
						</script>
					</body>
				</html>
			`;
			const redirectFilePath = path.resolve(outputBaseDir, fromPath);
			if (!redirectFilePath.startsWith(path.resolve(outputBaseDir))) {
				throw new Error(
					`Invalid redirect from ${JSON.stringify(fromPath)} to ${JSON.stringify(toPath)}: From path is not in project`,
				);
			}

			writeFileSync(redirectFilePath, redirectPageContent);
		}
	};

	renderer.on(RendererEvent.END, (event: RendererEvent) => {
		buildDoctestPage(event.outputDirectory);
		buildRedirects(event.outputDirectory);
	});
};

export default loadRendererHooks;
