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

	return editor;
};

// Saves [editor]'s content as an SVG and displays the result.
const showSavePopup = (editor: Editor) => {
	const popup = window.open();

	if (popup === null) {
		throw new Error('Unable to open save popup!');
	}

	const img = editor.toSVG();
	const imgHTML = img.outerHTML;

	popup.document.open();
	popup.document.write(`
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
			</style>
			<p>
				⚠ Warning ⚠: Some browsers won't save images over 2.5-ish MiB!
			</p>
			<div id='previewRegion'>
				<p>Saving to <code>localStorage</code>...</p>
			</div>
		</body>
		</html>`
	);
	popup.document.close();

	// Loading the preview can be much slower than saving the image.
	// Only do so if requested.
	const previewRegion = popup.document.querySelector('#previewRegion')!;
	const previewButton = popup.document.createElement('button');
	previewButton.innerText = 'View generated SVG image';
	previewButton.onclick = () => {
		const messageContainer = popup.document.createElement('p');
		const svgTextContainer = popup.document.createElement('textarea');

		const imagePreview = popup.document.createElementNS(
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

	const downloadButton = popup.document.createElement('button');
	downloadButton.innerText = 'Download';
	downloadButton.onclick = () => {
		const blob = new Blob([ imgHTML ], { type: 'image/svg' });
		const objectURL = URL.createObjectURL(blob);

		const link = popup.document.createElement('a');
		link.href = objectURL;
		link.innerText = 'Download';
		// Download as: (Ref: https://stackoverflow.com/a/52814195/17055750)
		link.setAttribute('download', 'editor-save.svg');

		downloadButton.replaceWith(link);
		link.click();

		// Release URL (see section on object URLs in
		// https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
		link.remove();
		URL.revokeObjectURL(objectURL);
	};
	popup.document.body.appendChild(downloadButton);

	let localStorageSaveStatus = 'Unable to save to localStorage. ';
	if (window.localStorage) {
		// Save
		window.localStorage.setItem(saveLocalStorageKey, imgHTML);
		localStorageSaveStatus = 'Saved to localStorage! ';
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
		previewButton,
	);
};


const startVisualErrorLog = () => {
	const logArea: HTMLTextAreaElement = document.querySelector('#logOutput')!;
	logArea.style.display = 'block';
	logArea.value = `

If enabled, errors will be logged to this textarea.


	`;

	const scrollLogToEnd = () => {
		logArea.scrollTop = logArea.scrollHeight;
	};

	window.onerror = (evt) => {
		logArea.value += '\nError thrown: ' + evt + '\n';
		scrollLogToEnd();
	};
	const originalErrFn = console.error;
	console.error = (...data) => {
		originalErrFn.apply(console, data);
		logArea.value += '\nError logged: ' + data.join(', ') + '\n';
		scrollLogToEnd();
	};
};

(() => {
	const showErrorsCheckbox: HTMLInputElement = document.querySelector('#alertOnError')!;
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

	startButton.onclick = () => {
		const textareaData = loadFromTextarea.value;
		const showErrors = showErrorsCheckbox.checked;
		optionsScreen.remove();

		if (showErrors) {
			startVisualErrorLog();
		}

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
