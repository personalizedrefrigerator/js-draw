```ts,runnable
import { Editor, Vec3, Mat33, EditorSettings, ShortcutManager } from 'js-draw';

// Use the Material Icon pack.
import { MaterialIconProvider } from '@js-draw/material-icons';

// Apply js-draw CSS
import 'js-draw/styles';
// If your bundler doesn't support the above, try
// import 'js-draw/bundledStyles';

(async () => {
	// All settings are optional! Try commenting them out.
	const settings: EditorSettings = {
		// Use a non-default set of icons
		iconProvider: new MaterialIconProvider(),

		// Only capture mouse wheel events if the editor has focus. This is useful
		// when the editor is part of a larger, scrolling page.
		wheelEventsEnabled: 'only-if-focused',
	};

	// Create the editor!
	const editor = new Editor(document.body, settings);

	// Adds the defualt toolbar
	const toolbar = editor.addToolbar();

	// Increases the minimum height of the editor
	editor.getRootElement().style.height = '600px';

	// Loads from SVG data
	await editor.loadFromSVG(`
		<svg
			viewBox="0 0 500 500"
			width="500" height="500"
			version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M500,500L500,0L0,0L0,500L500,500"
				fill="#aaa"
				class="js-draw-image-background"
			/>
			<text
				style="transform: matrix(1, 0, 0, 1, 57, 192); font-family: serif; font-size: 32px; fill: #111;"
			>Testing...</text>
		</svg>
	`);

	// Adding tags to a toolbar button allows different styles to be applied.
	// Also see addActionButton.
	toolbar.addSaveButton(() => {
		const saveData = editor.toSVG().outerHTML;

		// Do something with saveData
		alert('Saved data!\n\n' + saveData);
	});

	toolbar.addExitButton(() => {
		// Save/confirm exiting here?
		editor.remove();
	});
})();
```
