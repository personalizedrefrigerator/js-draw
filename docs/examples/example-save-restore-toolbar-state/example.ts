import * as jsdraw from 'js-draw';
import 'js-draw/styles';

// Key in window.localStorage to store the last state of the toolbar.
const editorStateLocalStorageKey = 'editorToolbarState';

/**
 * Saves the current state of an `Editor`'s toolbar to `localStorage`.
 *
 * Note: This is largely copied from docs/demo/storage/settings.ts.
 */
export const saveToolbarState = (toolbar: jsdraw.AbstractToolbar) => {
	try {
		localStorage.setItem(editorStateLocalStorageKey, toolbar.serializeState());
	} catch (e) {
		console.warn('Error saving editor prefs: ', e);
	}
};

/**
 * Loads the state of a toolbar from `localStorage` (if present) and applies it to the given
 * `toolbar`.
 */
export const restoreToolbarState = (toolbar: jsdraw.AbstractToolbar) => {
	const toolbarState = localStorage.getItem(editorStateLocalStorageKey);
	if (toolbarState) {
		// If the toolbar state is invalid, deserialize may throw errors. To prevent a change in
		// how toolbar state is stored from stopping the app, print a warning and continue if
		// we fail to deserialize the toolbar state.
		try {
			toolbar.deserializeState(toolbarState);
		} catch (e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

const editor = new jsdraw.Editor(document.body);
const toolbar = editor.addToolbar();

// Load the toolbar (& tool) state from localstorage
restoreToolbarState(toolbar);

// Save to localstorage whenever a tool's state changes.
editor.notifier.on(jsdraw.EditorEventType.ToolUpdated, () => {
	saveToolbarState(toolbar);
});
