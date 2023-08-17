import 'katex/dist/katex.css';
import './browser.css';

import { join } from 'path';
import typeScriptToJS from '../typeScriptToJS';
import addCodeMirrorEditor from './addCodeMirrorEditor';

const assetsPath: string = (window as any).assetsURL;
const imagesPath: string = (window as any).imagesURL;

const loadIframePreviewScript = async () => {
	const scriptPath = join(assetsPath, 'js-draw-typedoc-extension--iframe.js');

	const scriptRequest = await fetch(scriptPath);
	const scriptContent = (await scriptRequest.text());

	// Allow including inline in the iframe.
	return scriptContent.replace(/<[/]script>/g, '<\\/script>');
};

const initRunnableElements = async () => {
	let iframePreviewSetup: string|null = null; // null if not loaded

	const runnableElements = [...document.querySelectorAll('textarea.runnable-code')] as HTMLTextAreaElement[];

	for (const runnable of runnableElements) {
		// Replace the textarea with a CodeMirror editor
		const editorContainer = document.createElement('div');
		editorContainer.classList.add('runnable-code');

		const editor = addCodeMirrorEditor(
			// Multiline code blocks have an extra newline at the end. Remove it.
			runnable.value.trimEnd(),
			editorContainer,
		);

		const button = document.createElement('button');
		button.innerText = '▶ Run';


		let previewFrame: HTMLIFrameElement|null = null;
		button.onclick = async () => {
			if (previewFrame) {
				previewFrame.remove();
				previewFrame = null;
				return;
			}

			iframePreviewSetup ??= await loadIframePreviewScript();

			const js = typeScriptToJS(editor.getText());

			previewFrame = document.createElement('iframe');
			previewFrame.src = 'about:blank';
			previewFrame.classList.add('code-run-frame');

			// Sandboxing:
			previewFrame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
			previewFrame.setAttribute('csp', 'default-src \'about:blank\'');

			button.insertAdjacentElement('afterend', previewFrame);


			const doc = previewFrame.contentDocument!;

			doc.open();
			doc.write(`
				<!DOCTYPE html>
				<html>
					<head>
					</head>
					<body>
					</body>
					<script>
						window.mode = ${JSON.stringify(runnable.getAttribute('data--mode'))};
						${iframePreviewSetup}
					</script>
					<script>
						${js}
					</script>
				</html>
			`);
			doc.close();

			// After loading, ensure that the preview window is large enough for its content.
			previewFrame.contentWindow?.addEventListener('load', () => {
				// Additional time for any async code to run
				setTimeout(() => {
					if (previewFrame && doc.scrollingElement) {
						previewFrame.style.height = `${doc.scrollingElement.scrollHeight}px`;
					}
				}, 0);
			});
		};

		editorContainer.appendChild(button);
		runnable.replaceWith(editorContainer);
	}
};

// Fix image URLs that are relative to the root of the repository
const fixImageURLs = () => {
	const images = document.querySelectorAll('img[src^="docs/img/"]') as NodeListOf<HTMLImageElement>;
	for (const image of images) {
		// Determine the path to the image relative to the docs/img/ directory
		const imagePath = image.src.replace(/^.*(docs[/]img[/])/, '');
		const newSrc = join(imagesPath, imagePath);
		image.src = newSrc;
	}
};

window.addEventListener('DOMContentLoaded', () => fixImageURLs());

window.addEventListener('load', async () => {
	await initRunnableElements();
});
