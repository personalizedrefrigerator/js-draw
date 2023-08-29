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


	let previewFrame: HTMLIFrameElement|null = null;
	const closeFrame = () => {
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
		previewFrame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-modals');
		previewFrame.setAttribute('csp', 'default-src \'about:blank\'');

		controlsArea.insertAdjacentElement('afterend', previewFrame);


		const doc = previewFrame.contentDocument!;

		doc.open();
		doc.write(`
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
						${js}
					})();
				</script>
			</html>
		`);
		doc.close();


		const updateHeight = () => {
			const elem = doc.scrollingElement ?? doc.body;
			if (previewFrame && elem) {
				previewFrame.style.height = `${Math.max(100, elem.scrollHeight)}px`;
			}
		};

		// The load event doesn't seem to fire in some browsers (Safari/iOS).
		// Also update the height immediately.
		updateHeight();

		// After loading, ensure that the preview window is large enough for its content.
		previewFrame.contentWindow?.addEventListener('load', () => {
			// Additional time for any async code to run
			setTimeout(() => {
				updateHeight();
			}, 0);
		});
	};

	editorContainer.appendChild(controlsArea);
	elementToReplace.replaceWith(editorContainer);
};

export default replaceElementWithRunnableCode;
