import * as jsdraw from 'js-draw';
import MaterialIconProvider from '@js-draw/material-icons';
import 'js-draw/styles';

const settings: Partial<jsdraw.EditorSettings> = {
	iconProvider: new MaterialIconProvider(),

	// Only scroll the editor if it's focused.
	wheelEventsEnabled: 'only-if-focused',
};


const editor1 = new jsdraw.Editor(document.body, settings);
jsdraw.makeEdgeToolbar(editor1).addDefaults();


const editor2 = new jsdraw.Editor(document.body, settings);
jsdraw.makeDropdownToolbar(editor2).addDefaults();


const addEditorButton: HTMLButtonElement = document.querySelector('button#add-editor')!;

addEditorButton.onclick = () => {
	const editor = new jsdraw.Editor(document.body, settings);
	jsdraw.makeEdgeToolbar(editor).addDefaults();
};
