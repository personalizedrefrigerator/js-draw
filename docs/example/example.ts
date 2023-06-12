// To test importing from a parent directory
import { Editor, EditorEventType, HTMLToolbar } from '../../src/lib';
import '../../src/styles';

// If from an NPM package,
//import { Editor, HTMLToolbar } from 'js-draw';
//import 'js-draw/styles';

import { Localization, getLocalizationTable } from './localization';
import makeLoadFromSaveList from './ui/makeLoadFromSaveList';
import { StoreEntry } from './storage/AbstractStore';
import ImageSaver from './storage/ImageSaver';
import { IndexedDBStore } from './storage/IndexedDBStore';
import { LocalStorageStore } from './storage/LocalStorageStore';

import { showSavePopup, createFileSaver } from './util';
import FloatingActionButton from './ui/FloatingActionButton';
import { makeIconFromText } from './icons';
import makeNewImageDialog from './ui/makeNewImageDialog';

// Key in window.localStorage to save the SVG as.
export const saveLocalStorageKey = 'lastSave';
export const editorStateLocalStorageKey = 'editorState';

const createEditor = (localization: Localization, saveCallback: ()=>void): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);

	const toolbar = editor.addToolbar();

	// Add space between the save button and the other buttons.
	toolbar.addSpacer({ grow: 1, maxSize: '30px' });

	toolbar.addActionButton({
		label: localization.save,
		icon: editor.icons.makeSaveIcon(),
	}, () => {
		saveCallback();
	});

	// Show a confirmation dialog when the user tries to close the page.
	window.onbeforeunload = () => {
		return 'There may be unsaved changes. Really quit?';
	};

	// Save toolbar state whenever tool state changes (which could be caused by a
	// change in the one of the toolbar widgets).
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		saveToolbarState(toolbar);
	});

	// Load toolbar widget state from localStorage.
	restoreToolbarState(toolbar);

	return editor;
};

const saveImage = (editor: Editor, saveMethod: ImageSaver) => {
	// saveMethod defaults to saving to localStorage. Thus, if no saveMethod is given,
	// we save to localStorage.
	showSavePopup(editor.toSVG(), editor, saveMethod);
};

const saveToolbarState = (toolbar: HTMLToolbar) => {
	try {
		localStorage.setItem(editorStateLocalStorageKey, toolbar.serializeState());
	} catch (e) {
		console.warn('Error saving editor prefs: ', e);
	}
};

const restoreToolbarState = (toolbar: HTMLToolbar) => {
	const toolbarState = localStorage.getItem(editorStateLocalStorageKey);
	if (toolbarState) {
		// If the toolbar state is invalid, deserialize may throw errors. To prevent a change in
		// how toolbar state is stored from stopping the app, print a warning and continue if
		// we fail to deserialize the toolbar state.
		try {
			toolbar.deserializeState(toolbarState);
		} catch(e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

const hideLaunchOptions = () => {
	document.querySelector('#launchOptions')?.remove();
};

// PWA file access. At the time of this writing, TypeScript does not recognise window.launchQueue.
declare let launchQueue: any;

const handlePWALaunching = (localization: Localization) => {
	// PWA: Handle files on launch.
	// Ref: https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/handle-files#:~:text=Progressive%20Web%20Apps%20that%20can%20handle%20files%20feel,register%20as%20file%20handlers%20on%20the%20operating%20system.
	if ('launchQueue' in window) {
		// Create the editor and load files.
		launchQueue.setConsumer(async ({ files }: { files: any[] }) => {
			if (!files || files.length === 0) {
				return;
			}
			if (files.length > 1) {
				alert('Too many files!');
				return;
			}
			const file = files[0];
			const blob = await file.getFile();
			blob.handle = file;

			hideLaunchOptions();

			const fileSaver = createFileSaver(blob.name, file);
			const editor = createEditor(localization, () => saveImage(editor, fileSaver));

			const data = await blob.text();

			// Load the SVG data
			editor.loadFromSVG(data);
		});
	}
};

(async () => {
	const localization = getLocalizationTable();
	handlePWALaunching(localization);

	const loadFromStoreEntry = async (storeEntry: StoreEntry) => {
		const editor = createEditor(localization, () => saveImage(editor, storeEntry));

		// Load the SVG data
		editor.loadFromSVG(await storeEntry.read());
	};

	const launchButtonContainer = document.querySelector('#launchOptions');
	const dataStore = new LocalStorageStore(localization);

	const loadSaveList = await makeLoadFromSaveList(dataStore, loadFromStoreEntry, localization);
	launchButtonContainer?.appendChild(loadSaveList);

	const dbStore = await IndexedDBStore.create(localization);

	const newImageFAB = new FloatingActionButton({
		title: localization.new,
		icon: makeIconFromText('+')
	}, document.body);

	newImageFAB.addClickListener(async () => {
		newImageFAB.setDisabled(true);
		const entry = await makeNewImageDialog(localization, dbStore);
		newImageFAB.setDisabled(false);

		if (entry === null) {
			console.log('Creating new item canceled');
			return;
		}

		await loadFromStoreEntry(entry);
	});

	const dbLoadSaveList = await makeLoadFromSaveList(dbStore, loadFromStoreEntry, localization);
	launchButtonContainer?.appendChild(dbLoadSaveList);
})();
