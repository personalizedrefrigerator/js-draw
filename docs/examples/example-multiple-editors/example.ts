import * as jsdraw from 'js-draw';
import MaterialIconProvider from '@js-draw/material-icons';
import 'js-draw/styles';

const defaultSettings: Partial<jsdraw.EditorSettings> = {
	// Default to material icons
	iconProvider: new MaterialIconProvider(),

	// Only scroll the editor if it's focused.
	wheelEventsEnabled: 'only-if-focused',

	// Stop scrolling if the image isn't visible.
	allowOverscroll: false,
};


const editor1 = new jsdraw.Editor(document.body, defaultSettings);
jsdraw.makeEdgeToolbar(editor1).addDefaults();


const editor2 = new jsdraw.Editor(document.body, defaultSettings);
jsdraw.makeDropdownToolbar(editor2).addDefaults();


// Set up the "add editor" buttons
const addEditorButton1: HTMLButtonElement = document.querySelector('button#add-editor-1')!;
const addEditorButton2: HTMLButtonElement = document.querySelector('button#add-editor-2')!;


addEditorButton1.onclick = () => {
	const editor = new jsdraw.Editor(document.body, defaultSettings);
	jsdraw.makeEdgeToolbar(editor).addDefaults();
};


addEditorButton2.onclick = () => {
	const editor = new jsdraw.Editor(document.body, {
		...defaultSettings,

		// Use a different icon provider
		iconProvider: new jsdraw.IconProvider(),
	});

	jsdraw.makeEdgeToolbar(editor).addDefaults();
};
