// To test importing from a parent directory
import Editor from '../../src/Editor';
import '../../src/styles';
import { showSavePopup, startVisualErrorLog } from './util';

// To test the NPM package
//import Editor from 'js-draw';
//import 'js-draw/styles';

// Key in window.localStorage to save the SVG as.
export const saveLocalStorageKey = 'lastSave';

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

const saveImage = (editor: Editor) => {
	showSavePopup(editor.toSVG());
};


// PWA file access. At the time of this writing, TypeScript does not recognise window.launchQueue.
declare let launchQueue: any;

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

	// PWA: Handle files on launch.
	// Ref: https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/handle-files#:~:text=Progressive%20Web%20Apps%20that%20can%20handle%20files%20feel,register%20as%20file%20handlers%20on%20the%20operating%20system.
	if ('launchQueue' in window) {
		// Create the editor and load files.
		launchQueue.setConsumer(async ({ files }: { files: any[] }) => {
			optionsScreen.remove();	
			const editor = createEditor(() => saveImage(editor));

			if (files && files.length > 0) {
				for (const file of files) {
					const blob = await file.getFile();
					blob.handle = file;
					const data = blob.text();

					// Load the SVG data
					editor.loadFromSVG(data);
				}
			}
		});
	}

	startButton.onclick = () => {
		const textareaData = loadFromTextarea.value;
		const showErrors = showErrorsCheckbox.checked;
		optionsScreen.remove();

		if (showErrors) {
			startVisualErrorLog();
		}

		const editor = createEditor(() => saveImage(editor));

		sourceText ??= textareaData;
		if (sourceText === loadFromLastSaveText) {
			sourceText = window.localStorage?.getItem(saveLocalStorageKey) ?? '';
		}

		if (sourceText && sourceText.length > 0) {
			editor.loadFromSVG(sourceText);

			// Don't keep sourceText in memory --- it might be quite large.
			sourceText = '';
		}
	};
})();
