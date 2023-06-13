// If from an NPM package,
//import { Editor, EditorEventType, HTMLToolbar, EventDispatcher } from 'js-draw';
//import 'js-draw/styles';

// Because this example is in the same workspace as js-draw, we import
// everything local paths.
import { Editor, EditorEventType, HTMLToolbar, EventDispatcher } from '../../src/lib';
import '../../src/styles';

import { Localization, getLocalizationTable } from './localization';
import makeLoadFromSaveList from './ui/makeLoadFromSaveList';
import { StoreEntry } from './storage/AbstractStore';
import ImageSaver from './storage/ImageSaver';
import { IndexedDBStore } from './storage/IndexedDBStore';
import { LocalStorageStore } from './storage/LocalStorageStore';

import showSavePopup from './ui/showSavePopup';
import makeFileSaver from './storage/makeFileSaver';
import FloatingActionButton from './ui/FloatingActionButton';
import { makeIconFromText } from './icons';
import makeNewImageDialog from './ui/makeNewImageDialog';
import { AppNotifier } from './types';

// Key in window.localStorage to store the last state of the toolbar.
export const editorStateLocalStorageKey = 'editorState';

// Creates and sets up a new Editor
const createEditor = (
	// Mapping from keys to localized strings based on the user's locale.
	// For example, if the locale is es (for español), strings are in Spanish.
	localization: Localization,

	// An EventDispatcher used for this example app. js-draw uses EventDispatchers
	// internally, and we can use them too.
	appNotifier: AppNotifier,

	// Function that can be called to save the content of the editor.
	saveCallback: ()=>void,
): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);

	// Although new Editor(parentElement) created an Editor, it doesn't have a toolbar
	// yet. `.addToolbar()` creates a toolbar and adds it to the document, using the
	// default toolbar layout.
	const toolbar = editor.addToolbar();

	// Add space between the save button and the other buttons.
	toolbar.addSpacer({ grow: 1, maxSize: '30px' });

	// Show a "are you sure you want to leave this page" dialog
	// if there could be unsaved changes.
	setUpUnsavedChangesWarning(localization, editor, appNotifier);

	toolbar.addActionButton({
		label: localization.save,
		icon: editor.icons.makeSaveIcon(),
	}, () => {
		saveCallback();
	});

	// Save toolbar state whenever tool state changes (which could be caused by a
	// change in the one of the toolbar widgets).
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		saveToolbarState(toolbar);
	});

	// Load toolbar widget state from localStorage.
	restoreToolbarState(toolbar);

	// Set focus to the main region of the editor.
	// This allows keyboard shortcuts to work.
	editor.focus();

	return editor;
};

// Show a confirmation dialog if the user attemtps to close the page while there
// are unsaved changes.
const setUpUnsavedChangesWarning = (
	localization: Localization, editor: Editor, appNotifier: AppNotifier
) => {
	let hasChanges = false;

	// Show a confirmation dialog when the user tries to close the page.
	window.onbeforeunload = () => {
		if (hasChanges) {
			return localization.confirmUnsavedChanges;
		}

		return undefined;
	};

	// Watch for commands to be done or undone: If this happens, there are likely
	// unsaved changes.
	editor.notifier.on(EditorEventType.CommandDone, () => {
		hasChanges = true;
	});

	editor.notifier.on(EditorEventType.CommandUndone, () => {
		hasChanges = true;
	});

	// Listen for 'image-saved' events from the application notifier.
	appNotifier.on('image-saved', () => {
		hasChanges = false;
	});
};

// Saves the contents of `editor` using the given `saveMethod` (an ImageSaver is an
// interface this example defines to simplify saving to localStorage/indexeddb/other storage
// methods).
// An `AppNotifier` is an `EventDispatcher` (from js-draw) that allows us to send/receive
// custom events.
const saveImage = (
	localization: Localization,

	editor: Editor,
	saveMethod: ImageSaver,
	appNotifier: AppNotifier,
) => {
	const onSaveSuccess = () => {
		// Notify other parts of the app that the image was saved successfully.
		appNotifier.dispatch('image-saved', null);
	};

	showSavePopup(localization, editor.toSVG(), editor, saveMethod, onSaveSuccess);
};

// Saves the current state of an `Editor`'s toolbar to `localStorage`.
const saveToolbarState = (toolbar: HTMLToolbar) => {
	try {
		localStorage.setItem(editorStateLocalStorageKey, toolbar.serializeState());
	} catch (e) {
		console.warn('Error saving editor prefs: ', e);
	}
};

// Loads the state of a toolbar from `localStorage` (if present) and applies it to the given
// `toolbar`.
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

// Destroys the welcome screen.
const hideLaunchOptions = () => {
	document.querySelector('#launchOptions')?.remove();
};


// PWA file access. At the time of this writing, TypeScript does not recognise window.launchQueue.
declare let launchQueue: any;

// Progressive Web Apps (PWAs) support registering a file handler. This function
// checks whether this app was given a file to open and, if so, opens it.
const handlePWALaunching = (localization: Localization, appNotifier: AppNotifier) => {
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

			const fileSaver = makeFileSaver(blob.name, file);
			const editor = createEditor(
				localization,
				appNotifier,

				() => saveImage(localization, editor, fileSaver, appNotifier));

			const data = await blob.text();

			// Load the SVG data
			editor.loadFromSVG(data);
		});
	}
};

(async () => {
	// Get a set of localized strings so that this app can be displayed in
	// a language the user is familiar with.
	const localization = getLocalizationTable();
	const appNotifier: AppNotifier = new EventDispatcher();

	// If launched with a file to open, open the file.
	handlePWALaunching(localization, appNotifier);

	// Load from a data store entry. `storeEntry` might be, for example,
	// an image and its metadata as stored in this app's database.
	const loadFromStoreEntry = async (storeEntry: StoreEntry) => {
		const editor = createEditor(
			localization,
			appNotifier,

			() => saveImage(localization, editor, storeEntry, appNotifier)
		);

		// Load the SVG data
		editor.loadFromSVG(await storeEntry.read());
	};

	// launchButtonContainer will contain a list of recent drawings
	const launchButtonContainer = document.querySelector('#launchOptions');

	// Wrap window.localStorage in a class that facilitates reading/writing to it.
	const localStorageDataStore = new LocalStorageStore(localization);

	// Wrap window.indexeddb in a similar class. Both extend AbstractStore, which
	// allows our image saving/loading code to work with either/both.
	const dbStore = await IndexedDBStore.create(localization);

	// Create a list of buttons for loading recent saves.
	const dbLoadSaveList = await makeLoadFromSaveList(dbStore, loadFromStoreEntry, localization);
	launchButtonContainer?.appendChild(dbLoadSaveList);

	const lsLoadSaveList = await makeLoadFromSaveList(localStorageDataStore, loadFromStoreEntry, localization);
	launchButtonContainer?.appendChild(lsLoadSaveList);

	// Add a "new image" floating action button.
	const newImageFAB = new FloatingActionButton({
		title: localization.new,
		icon: makeIconFromText('+')
	}, document.body);

	newImageFAB.addClickListener(async () => {
		// Disable the FAB while the "new image" dialog is open: We don't want
		// the user to be able to make multiple "new image" dialogs be present
		// on the screen at the same time.
		newImageFAB.setDisabled(true);
		const entry = await makeNewImageDialog(localization, dbStore);
		newImageFAB.setDisabled(false);

		if (entry === null) {
			console.log('Creating new item canceled.');
			return;
		}

		await loadFromStoreEntry(entry);
	});
})();
