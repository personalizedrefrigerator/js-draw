import 'katex/dist/katex.css';
import './browser.css';

import { join } from 'path';
import typeScriptToJS from '../typeScriptToJS';
import addCodeMirrorEditor from './addCodeMirrorEditor';

const loadIframePreviewScript = async () => {
	const scriptPath = join((window as any).assetsURL, 'js-draw-typedoc-extension--iframe.js');

	const scriptRequest = await fetch(scriptPath);
	const scriptContent = (await scriptRequest.text());

	// Allow including inline in the iframe.
	return scriptContent.replace(/<[/]script>/g, '<\\/script>');
};

window.addEventListener('load', async () => {
	let iframePreviewSetup: string|null = null; // null if not loaded

	const runnableElements = [...document.querySelectorAll('textarea.runnable-code')] as HTMLTextAreaElement[];

	for (const runnable of runnableElements) {
		// Replace the textarea with a CodeMirror editor
		const editorContainer = document.createElement('div');
		editorContainer.classList.add('runnable-code');

		const editor = addCodeMirrorEditor(runnable.value, editorContainer);

		const button = document.createElement('button');
		button.innerText = 'Run';


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

			console.log(iframePreviewSetup);

			doc.open();
			doc.write(`
				<!DOCTYPE html>
				<html>
					<head>
					</head>
					<body>
					</body>
					<script>
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
});
