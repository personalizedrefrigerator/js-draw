```ts,runnable
import { EditorSettings, Editor, KeyBinding, makeEdgeToolbar } from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';

// All settings are optional! Try commenting them out.
const settings: EditorSettings = {
	// Use a non-default set of icons
	iconProvider: new MaterialIconProvider(),

	// Only capture mouse wheel events if the editor has focus. This is useful
	// when the editor is part of a larger, scrolling page.
	wheelEventsEnabled: 'only-if-focused',

	// The default minimum zoom is 2e-10...
	minZoom: 2e-10,

	// and the maximum default zoom is 1e12
	maxZoom: 1e12,

	// Override some keyboard shortcuts!
	keyboardShortcutOverrides: {
		// The ID for the save action
		'jsdraw.toolbar.SaveActionWidget.save': [
			// "Meta" = the command key on MacOS
			KeyBinding.fromString('ctrlOrMeta+s'),

			// Also map ctrl+M to save!
			KeyBinding.fromString('ctrl+m'),
		],
	},
};

// Create the editor!
const editor = new Editor(document.body, settings);

// Selects a specific toolbar type. See also makeDropdownToolbar
const toolbar = makeEdgeToolbar(editor);
toolbar.addDefaults();

// Add the action button that is triggered by the save keyboard shortcuts above.
toolbar.addSaveButton(() => {
	const saveData = editor.toSVG().outerHTML;

	// Do something with saveData
	alert('Saved data:\n\n' + saveData);
});
```
