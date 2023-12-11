import addCodeMirrorEditor, { EditorLanguage } from './addCodeMirrorEditor';

import typeScriptToJS from '../../typeScriptToJS';
import loadIframePreviewScript from './loadIframePreviewScript';

/** Replaces the given `elementToReplace` with a runnable code area. */
const replaceElementWithRunnableCode = (elementToReplace: HTMLElement) => {
	// Replace the textarea with a CodeMirror editor
	const editorContainer = document.createElement('div');
	editorContainer.classList.add('runnable-code');

	// Prevent TypeDoc from consuming the '/' key
	editorContainer.onkeydown = event => {
		if (event.key === '/') {
			event.stopPropagation();
		}
	};

	const languageCode = elementToReplace.getAttribute('data--lang') ?? 'ts';
	const languageCodeToLanguage: Record<string, EditorLanguage> = {
		'css': EditorLanguage.CSS,
		'js': EditorLanguage.JavaScript,
		'ts': EditorLanguage.TypeScript,
	};
	const language = languageCodeToLanguage[languageCode] ?? EditorLanguage.TypeScript;

	// Multiline code blocks have an extra newline at the end. Remove it.
	let initialEditorValue = elementToReplace.innerText.trimEnd();
	let bodyHTML = '';
	let defaultJS = '';

	// If CSS, either HTML or JavaScript needs to be provided.
	if (language === EditorLanguage.CSS) {
		const parts = initialEditorValue.split(/[\n]---(html|js|ts)---[\n]/g);

		// Beginning, capture, end
		if (parts.length !== 3) {
			throw new Error('Runnable CSS regions must contain exactly one ---html--- or ---js--- or ---ts--- separator (on its own line).');
		}

		initialEditorValue = parts[0];

		if (parts[1] === 'html') {
			bodyHTML = parts[2];
		}
		else if (parts[1] === 'js') {
			defaultJS = parts[2];
		}
		else if (parts[1] === 'ts') {
			defaultJS = typeScriptToJS(parts[2]);
		}
		else {
			throw new Error('Invalid state');
		}
	}

	// Allow only part of the runnable content to be shown in the editor --
	// the part after a ---visible--- line.
	// The /s modifier allows . to match newlines. See https://stackoverflow.com/a/8303552
	const hiddenContentMatch = /^(.*)[\n]---visible---[\n](.*)$/sg.exec(initialEditorValue);

	// invisibleContent won't be shown in the editor
	const invisibleContent = hiddenContentMatch	? hiddenContentMatch[1] : '';
	initialEditorValue = hiddenContentMatch ? hiddenContentMatch[2] : initialEditorValue;

	const editor = addCodeMirrorEditor(
		initialEditorValue,
		editorContainer,
		language,
	);

	const controlsArea = document.createElement('div');
	const runButton = document.createElement('button');
	runButton.innerText = '▶ Run';
	const hideButton = document.createElement('button');
	hideButton.innerText = 'Hide';
	controlsArea.replaceChildren(runButton, hideButton);

	const getContentToRun = () => {
		const editorText = invisibleContent + '\n' + editor.getText();
		let js = '';
		let css = '';

		if (language === EditorLanguage.TypeScript) {
			js = typeScriptToJS(editorText);
		}
		else if (language === EditorLanguage.JavaScript) {
			js = editorText;
		}
		else if (language === EditorLanguage.CSS) {
			css = editorText;
			js = defaultJS;
		}
		else {
			const exhaustivenessCheck: never = language;
			return exhaustivenessCheck;
		}

		return { js, css };
	};


	let removeMessageListener: (()=>void)|null = null;
	let previewFrame: HTMLIFrameElement|null = null;

	const closeFrame = () => {
		removeMessageListener?.();
		previewFrame?.remove();
		previewFrame = null;
	};

	hideButton.onclick = () => {
		closeFrame();
		hideButton.style.display = 'none';
	};
	hideButton.style.display = 'none';

	runButton.onclick = async () => {
		closeFrame();
		hideButton.style.display = '';

		const iframePreviewSetup = await loadIframePreviewScript();

		const { js, css } = getContentToRun();

		previewFrame = document.createElement('iframe');
		previewFrame.src = 'about:blank';
		previewFrame.classList.add('code-run-frame');

		// Sandboxing:
		previewFrame.setAttribute('sandbox', 'allow-scripts allow-modals');

		// This *should* allow including </script> tags in strings in most cases.
		// TODO: Find another way to do this.
		const escapedJs = js.replace(/<[/]script>/ig, '<\\/script>');

		previewFrame.srcdoc = `
			<!DOCTYPE html>
			<html>
				<head>
					<style>
						${css}
					</style>
					<script>
						window.mode = ${JSON.stringify(elementToReplace.getAttribute('data--mode'))};
						${iframePreviewSetup}
					</script>
				</head>
				<body>
					${bodyHTML}
				</body>
				<script>
					"use strict";
					(async () => {
						${escapedJs}
					})();
				</script>
			</html>
		`;

		const messageListener = (event: MessageEvent) => {
			// Iframes with content set by srcdoc= have origin set to null.
			if (event.origin !== 'null') {
				console.log('ignoring event with origin', event.origin);
				return;
			}

			if (!previewFrame) {
				return;
			}

			if (event.data?.message === 'updateHeight' && event.data?.height) {
				previewFrame.style.height = `${event.data.height}px`;
			}
		};
		window.addEventListener('message', messageListener);

		removeMessageListener = () => {
			window.removeEventListener('message', messageListener);
		};

		controlsArea.insertAdjacentElement('afterend', previewFrame);
	};

	editorContainer.appendChild(controlsArea);
	elementToReplace.replaceWith(editorContainer);
};

export default replaceElementWithRunnableCode;
