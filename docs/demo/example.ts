import { Editor, EditorEventType, EventDispatcher, makeEdgeToolbar } from 'js-draw';
import 'js-draw/styles';
import MaterialIconProvider from '@js-draw/material-icons';
import { DebugToolbarWidget } from '@js-draw/debugging';

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
import { isDebugWidgetEnabled, loadKeybindingOverrides, restoreToolbarState, saveToolbarState } from './storage/settings';
import makeSettingsDialog from './ui/makeSettingsDialog';

// Creates and sets up a new Editor
const createEditor = async (
	// Mapping from keys to localized strings based on the user's locale.
	// For example, if the locale is es (for español), strings are in Spanish.
	localization: Localization,

	// An EventDispatcher used for this example app. js-draw uses EventDispatchers
	// internally, and we can use them too.
	appNotifier: AppNotifier,

	// Function that can be called to save the content of the editor.
	saveCallback: (onComplete?: ()=>void)=>void,

	// Function that returns the initial editor data
	getInitialSVGData: ()=>Promise<string>,
): Promise<Editor> => {
	const parentElement = document.body;
	const editor = new Editor(parentElement, {
		keyboardShortcutOverrides: loadKeybindingOverrides(),
		iconProvider: new MaterialIconProvider(),

		// Specify a custom app name for the about dialog,
		// but not a custom version.
		appInfo: {
			name: 'js-draw demo',
			description: 'An app demonstrating the js-draw library\'s functionality.',
		},
	});

	const { hasChanges } = watchForChanges(editor, appNotifier);

	// Although new Editor(parentElement) created an Editor, it doesn't have a toolbar
	// yet. `.addToolbar()` creates a toolbar and adds it to the document, using the
	// default toolbar layout.
	const toolbar = makeEdgeToolbar(editor);

	toolbar.addDefaultToolWidgets();

	const closeEditor = () => {
		editor.remove();
		void reShowLaunchOptions(localization, appNotifier);
	};

	// Add buttons in this order (exit, undo/redo, save) so that the
	// tab order matches the display order (which is set with CSS).
	toolbar.addExitButton(() => {
		if (hasChanges() && confirm(localization.saveUnsavedChanges)) {
			saveCallback(closeEditor);
		} else {
			closeEditor();
		}
	});

	toolbar.addUndoRedoButtons();

	const saveButton = toolbar.addSaveButton(() => {
		saveCallback();
	});


	if (isDebugWidgetEnabled()) {
		toolbar.addWidget(new DebugToolbarWidget(editor));
	}


	// Save toolbar state whenever tool state changes (which could be caused by a
	// change in the one of the toolbar widgets).
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		saveToolbarState(toolbar);
	});

	// Load toolbar widget state from localStorage.
	restoreToolbarState(toolbar);

	// Show a "are you sure you want to leave this page" dialog
	// if there could be unsaved changes.
	setUpUnsavedChangesWarning(localization, hasChanges);

	// Set focus to the main region of the editor.
	// This allows keyboard shortcuts to work.
	editor.focus();

	// Loading the SVG:
	// First, ensure that users can't save an incomplete image by disabling save
	// and editing (disabling editing allows the exit button to still be clickable, so
	// long as there is nothing to save).
	editor.setReadOnly(true);
	saveButton.setDisabled(true);

	await editor.loadFromSVG(await getInitialSVGData());

	// After loading, re-enable editing.
	editor.setReadOnly(false);
	saveButton.setDisabled(false);
	console.assert(!hasChanges(), 'should not have changes just after loading the image');

	return editor;
};

// Watches `editor` for changes.
const watchForChanges = (editor: Editor, appNotifier: AppNotifier) => {
	let hasChanges = false;

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

	return {
		hasChanges: () => hasChanges,
	};
};

// Show a confirmation dialog if the user attemtps to close the page while there
// are unsaved changes.
const setUpUnsavedChangesWarning = (
	localization: Localization, hasChanges: ()=>boolean,
) => {
	// Show a confirmation dialog when the user tries to close the page.
	window.onbeforeunload = () => {
		if (hasChanges()) {
			return localization.confirmUnsavedChanges;
		}

		return undefined;
	};

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

	onDialogClose?: ()=>void
) => {
	const onSaveSuccess = () => {
		// Notify other parts of the app that the image was saved successfully.
		appNotifier.dispatch('image-saved', null);
	};

	// Increase the size of very small images.
	const toSVGOptions = {
		minDimension: 30,
	};

	showSavePopup(localization, editor.toSVG(toSVGOptions), editor, saveMethod, onSaveSuccess, onDialogClose);
};

// Destroys the welcome screen.
let launchScreen: HTMLElement|null = null;
const hideLaunchOptions = () => {
	launchScreen = document.querySelector('#launchOptions');
	launchScreen?.remove();
};

const reShowLaunchOptions = async (localization: Localization, appNotifier: AppNotifier) => {
	if (launchScreen) {
		launchScreen.replaceChildren();
		await fillLaunchList(launchScreen, localization, appNotifier);
		document.body.appendChild(launchScreen);
	}
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
			const editor = await createEditor(
				localization,
				appNotifier,

				onClose => saveImage(localization, editor, fileSaver, appNotifier, onClose),

				() => blob.text());
		});
	}
};

// Fills `launchButtonContainer` with a list of recent saves
const fillLaunchList = async (
	launchButtonContainer: HTMLElement, localization: Localization, appNotifier: AppNotifier
) => {
	// Load from a data store entry. `storeEntry` might be, for example,
	// an image and its metadata as stored in this app's database.
	const loadFromStoreEntry = async (storeEntry: StoreEntry) => {
		hideLaunchOptions();

		const editor = await createEditor(
			localization,
			appNotifier,

			// A function called when the save button is pressed
			// onClose should be fired when the save dialog closes.
			onClose => saveImage(localization, editor, storeEntry, appNotifier, onClose),

			// A function that returns the initial SVG data to load
			() => storeEntry.read(),
		);
	};

	const errorList = document.createElement('ul');
	errorList.classList.add('error-container');
	launchButtonContainer.appendChild(errorList);

	const showError = (errorMessage: string) => {
		const messageContainer = document.createElement('li');
		messageContainer.innerText = errorMessage;
		errorList.appendChild(messageContainer);
		errorList.classList.add('has-errors');
	};

	// Wrap window.localStorage in a class that facilitates reading/writing to it.
	const localStorageDataStore = new LocalStorageStore(localization);

	// Wrap window.indexeddb in a similar class. Both extend AbstractStore, which
	// allows our image saving/loading code to work with either/both.
	let dbStore: IndexedDBStore|null;
	try {
		dbStore = await IndexedDBStore.create(localization);
	} catch (error) {
		showError(`${localization.databaseLoadError} Error: ${error}`);
		dbStore = null;
	}

	// Create a list of buttons for loading recent saves.
	if (dbStore) {
		const dbLoadSaveList = await makeLoadFromSaveList(dbStore, loadFromStoreEntry, localization);
		launchButtonContainer.appendChild(dbLoadSaveList);
	}

	const lsLoadSaveList = await makeLoadFromSaveList(localStorageDataStore, loadFromStoreEntry, localization);
	launchButtonContainer.appendChild(lsLoadSaveList);

	// Add a "new image" floating action button.
	const newImageFAB = new FloatingActionButton({
		title: localization.new,
		icon: makeIconFromText('+')
	}, launchButtonContainer);

	newImageFAB.addClickListener(async () => {
		// Disable the FAB while the "new image" dialog is open: We don't want
		// the user to be able to make multiple "new image" dialogs be present
		// on the screen at the same time.
		newImageFAB.setDisabled(true);
		const entry = await makeNewImageDialog(localization, dbStore ?? localStorageDataStore);
		newImageFAB.setDisabled(false);

		if (entry === null) {
			console.log('Creating new item canceled.');
			return;
		}

		await loadFromStoreEntry(entry);
	});

	const settingsButton = document.createElement('button');
	settingsButton.innerText = localization.settings;
	settingsButton.onclick = async () => {
		settingsButton.style.display = 'none';
		await makeSettingsDialog(localization);
		settingsButton.style.display = 'block';
	};
	settingsButton.classList.add('settingsButton');
	launchButtonContainer.appendChild(settingsButton);
};

(async () => {
	// Get a set of localized strings so that this app can be displayed in
	// a language the user is familiar with.
	const localization = getLocalizationTable();
	const appNotifier: AppNotifier = new EventDispatcher();

	// If launched with a file to open, open the file.
	handlePWALaunching(localization, appNotifier);

	// launchButtonContainer will contain a list of recent drawings
	const launchButtonContainer = document.querySelector('#launchOptions') as HTMLElement;
	await fillLaunchList(launchButtonContainer, localization, appNotifier);
})();
