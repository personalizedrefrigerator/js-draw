// To test importing from a parent directory
import Editor from '../../src/Editor';
import '../../src/styles';

// To test the NPM package
//import Editor from 'js-draw';
//import 'js-draw/styles';

// Key in window.localStorage to save the SVG as.
const saveLocalStorageKey = 'lastSave';

const createEditor = (saveCallback: ()=>void): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);
	const toolbar = editor.addToolbar();

	toolbar.addActionButton('Save', () => {
		saveCallback();
	});

	// Show a confirmation dialog when the user tries to close the page.
	window.onbeforeunload = () => {
		return 'There may be unsaved changes. Really quit?';
	};

	return editor;
};

// Saves [editor]'s content as an SVG and displays the result.
const showSavePopup = (editor: Editor) => {
	const popupContainer = document.createElement('div');
	popupContainer.classList.add('popupContainer');
	popupContainer.appendChild(document.createTextNode('Saving...'));
	document.body.appendChild(popupContainer);

	const popupIframe = document.createElement('iframe');
	popupIframe.src = 'about:blank';

	// Turn on sandboxing -- the user may attempt to display the SVG directly in the sandbox.
	// Allow-scripts is required by Safari on iOS to have click listeners on buttons.
	// TODO: Check whether this is still the case and remove allow-scripts if no longer necessary.
	popupIframe.setAttribute('sandbox', 'allow-same-origin allow-downloads allow-scripts');
	popupIframe.setAttribute('csp', 'default-src \'about:blank\'');
	popupContainer.replaceChildren(popupIframe);

	const popup = popupIframe.contentWindow!;
	const popupDoc = popupIframe.contentDocument!;

	if (popup === null) {
		throw new Error('Unable to open save popup!');
	}

	const img = editor.toSVG();
	const imgHTML = img.outerHTML;

	popupDoc.open();
	popupDoc.write(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta name='viewport' content='initial-scale=1.0'/>
			<meta charset='utf-8'/>
		</head>
		<body>
			<style>
				#previewRegion {
					display: flex;
					flex-direction: row;
				}

				svg {
					height: auto;
					width: auto;
					max-width: 500px;
					max-height: 100vh;
					flex-grow: 1;
					border: 1px solid gray;
				}

				textarea {
					flex-grow: 1;
					flex-shrink: 1;
					width: auto;
				}

				main {
					border: 1px solid gray;
					background-color: #eee;
					font-family: sans-serif;

					max-width: 600px;
					margin-left: auto;
					margin-right: auto;

					padding: 15px;
					border-radius: 15px;
				}

				#controlsArea {
					display: flex;
					flex-direction: row;
					margin-top: 14px;
				}

				#controlsArea button {
					flex-grow: 1;
				}

				body, :root {
					background-color: rgba(255, 255, 255, 0.0);
				}

				button {
					min-height: 35px;
				}

				@media (prefers-color-scheme: dark) {
					body, :root {
						background-color: rgba(0, 0, 0, 0.0);
						color: white;
					}

					main {
						background-color: #333;
					}

					a {
						color: pink;
					}

					input, button {
						background-color: #444;
						color: #eee;
						border: 1px solid #222;
						border-radius: 2px;

						transition: background-color 0.2s ease;
					}

					button:focus-visible, input:focus-visible {
						outline: 3px solid #777;
						background-color: #555;
					}

					button:active {
						background-color: #333;
					}
				}
			</style>
			<main>
				<p>
					⚠ Warning ⚠: Some browsers won't save images over 2.5-ish MiB!
				</p>
				<div id='previewRegion'>
					<p>Saving to <code>localStorage</code>...</p>
				</div>
				<div><label for='filename'>Download as: </label><input id='filename' type='text' value='editor-save.svg'/></div>
				<div id='controlsArea'>
				</div>
			</main>
		</body>
		</html>`
	);
	popupDoc.close();

	// Loading the preview can be much slower than saving the image.
	// Only do so if requested.
	const previewRegion = popupDoc.querySelector('#previewRegion')!;
	const previewButton = popupDoc.createElement('button');
	previewButton.innerText = 'View generated SVG image';
	previewButton.onclick = () => {
		const messageContainer = popupDoc.createElement('p');
		const svgTextContainer = popupDoc.createElement('textarea');

		const imagePreview = popupDoc.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);
		imagePreview.innerHTML = img.innerHTML;
		imagePreview.setAttribute('viewBox', img.getAttribute('viewBox') ?? '');

		messageContainer.innerText = 'Preview: ';
		svgTextContainer.value = imgHTML;

		previewRegion.replaceChildren(
			messageContainer, svgTextContainer, imagePreview
		);
	};

	const filenameInput: HTMLInputElement = popupDoc.querySelector('input#filename')!;
	const downloadButton = popup.document.createElement('button');
	downloadButton.innerText = 'Download';
	downloadButton.onclick = () => {
		const blob = new Blob([ imgHTML ], { type: 'image/svg' });
		const objectURL = URL.createObjectURL(blob);

		const link = popup.document.createElement('a');
		link.href = objectURL;
		link.innerText = 'Download';
		// Download as (Ref: https://stackoverflow.com/a/52814195/17055750)
		link.setAttribute('download', filenameInput.value);

		downloadButton.style.display = 'none';
		popupControlsArea.appendChild(link);
		link.click();

		// Release URL (see section on object URLs in
		// https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
		link.remove();
		URL.revokeObjectURL(objectURL);
	};

	filenameInput.oninput = () => {
		downloadButton.style.display = 'block';
	};

	const closeButton = popup.document.createElement('button');
	closeButton.innerText = 'Close';
	closeButton.onclick = () => {
		popupContainer.remove();
	};

	const popupControlsArea = popup.document.querySelector('main > #controlsArea')!;
	popupControlsArea.appendChild(closeButton);
	popupControlsArea.appendChild(previewButton);
	popupControlsArea.appendChild(downloadButton);


	let localStorageSaveStatus = 'Unable to save to localStorage. ';
	if (window.localStorage) {
		// Save
		try {
			window.localStorage.setItem(saveLocalStorageKey, imgHTML);
			localStorageSaveStatus = 'Saved to localStorage! ';
		} catch(e) {
			localStorageSaveStatus = `Error saving to localStorage: ${e} `;
		}
	}

	let imageSize = `${Math.round(imgHTML.length / 1024 * 10) / 10} KiB`;
	if (imgHTML.length > 1024 * 1024) {
		imageSize = `${Math.round(imgHTML.length / 1024 * 10 / 1024) / 10} MiB`;
	}

	previewRegion.replaceChildren(
		popup.document.createTextNode(localStorageSaveStatus),
		popup.document.createTextNode(
			`Image size: ${imageSize}.`
		),
	);
};

// PWA file access. At the time of this writing, TypeScript does not recognise window.launchQueue.
declare let launchQueue: any;

(() => {
	const loadFromTextarea: HTMLTextAreaElement = document.querySelector('#initialData')!;
	const fileInput: HTMLInputElement = document.querySelector('#initialFile')!;
	const startButton: HTMLButtonElement = document.querySelector('#startButton')!;
	const optionsScreen: HTMLElement = document.querySelector('#editorOptions')!;

	const loadFromLastSaveText = 'Load from last save (if available)';
	const loadFromFileText = 'Load from selected file';
	loadFromTextarea.value = loadFromLastSaveText;

	// SVG source string
	let sourceText: string|null = null;

	// Clear the file input (don't autofill)
	fileInput.value = '';

	// Handle file uploads.
	fileInput.onchange = () => {
		loadFromTextarea.value = '...';
		const files = fileInput.files ?? [];

		if (files.length > 1) {
			alert('Too many files!');
			return;
		}
		if (files.length === 0) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (progress => {
			if (progress.target?.result) {
				loadFromTextarea.value = loadFromFileText;

				// The reader was started with .readAsText, so we know [result]
				// is a string.
				sourceText = progress.target.result as string;
			}
		});
		reader.readAsText(files[0]);
	};

	// PWA: Handle files on launch.
	// Ref: https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/handle-files#:~:text=Progressive%20Web%20Apps%20that%20can%20handle%20files%20feel,register%20as%20file%20handlers%20on%20the%20operating%20system.
	if ('launchQueue' in window) {
		// Create the editor and load files.
		launchQueue.setConsumer(async ({ files }: { files: any[] }) => {
			optionsScreen.remove();	
			const editor = createEditor(() => showSavePopup(editor));

			if (files && files.length > 0) {
				for (const file of files) {
					const blob = await file.getFile();
					blob.handle = file;
					const data = blob.text();
					editor.loadFromSVG(data);
				}
			}
		});
	}

	startButton.onclick = () => {
		const textareaData = loadFromTextarea.value;
		optionsScreen.remove();

		const editor = createEditor(() => showSavePopup(editor));

		sourceText ??= textareaData;
		if (sourceText === loadFromLastSaveText) {
			sourceText = window.localStorage?.getItem(saveLocalStorageKey) ?? '';
		}

		if (sourceText && sourceText.length > 0) {
			editor.loadFromSVG(sourceText);
		}
	};
})();
