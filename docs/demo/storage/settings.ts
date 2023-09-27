import { AbstractToolbar, KeyBinding } from 'js-draw';

// Key in window.localStorage to store the last state of the toolbar.
const editorStateLocalStorageKey = 'editorState';


/** Saves the current state of an `Editor`'s toolbar to `localStorage`. */
export const saveToolbarState = (toolbar: AbstractToolbar) => {
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
export const restoreToolbarState = (toolbar: AbstractToolbar) => {
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


// Key in window.localStorage for the stored keybindings
const editorStateKeybindings = 'keybindingOverrides';

export const saveKeybindingOverrides = (overrides: Record<string, KeyBinding[]>) => {
	const jsonifiableData: Record<string, string[]> = {};

	for (const id in overrides) {
		jsonifiableData[id] = overrides[id].map(binding => binding.toString());
	}

	localStorage.setItem(editorStateKeybindings, JSON.stringify(jsonifiableData));
};

export const loadKeybindingOverrides = (): Record<string, KeyBinding[]> => {
	const stringData = localStorage.getItem(editorStateKeybindings) ?? '{}';
	const overrides: Record<string, KeyBinding[]> = {};

	try {
		const data = JSON.parse(stringData);

		if (typeof (data) !== 'object') {
			throw new Error('Expected keybinding overrides to have type "object"!');
		}

		for (const key in data) {
			if (typeof (data[key]) !== 'object' || typeof (data[key].length) !== 'number') {
				throw new Error(`Expected keybinding record to be an array. Record: ${key}: ${data[key]}.`);
			}

			overrides[key] = (data[key] as string[]).map(binding => {
				return KeyBinding.fromString(binding);
			});
		}
	} catch(e) {
		console.warn('Error loading keybinding overrides', e);
	}

	return overrides;
};
