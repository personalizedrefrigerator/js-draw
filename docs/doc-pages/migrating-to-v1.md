# Migrating to version 1

Version 1 of the `js-draw` library introduces many new features and [several breaking changes](https://github.com/personalizedrefrigerator/js-draw/blob/main/CHANGELOG.md#100). This guide summarizes the breaking API changes and major UI adjustments.

## Breaking API change: CSS variables

The CSS variables used to customize `js-draw`'s theme have changed.

<details><summary>Comparison between old and new CSS variables</summary>

**Old CSS variables**:

- `--primary-background-color`: Background color of the editor, toolbar, and menus
- `--primary-foreground-color`: Text/icon color of the content of the toolbar and menus
- `--secondary-background-color`: Background color of selected items
- `--secondary-foreground-color`: Text/icon color of selected items
- `--primary-shadow-color`: Color of shadows

**New CSS variables**:

- `--background-color-1`: Background color of the editor and some dialogs
- `--foreground-color-1`: Text/icon color of the editor and some dialogs
- `--background-color-2`: Background color of the main toolbar content
- `--foreground-color-2`: Text/icon color of the main toolbar content
- `--background-color-3`: Background color of action buttons in the toolbar and some toolbar widgets
- `--foreground-color-3`: Text/icon color of action buttons in the toolbar
- `--selection-background-color`: Background color of selected content
- `--selection-foreground-color`: Foreground color of selected content
- `--shadow-color`: Color used for shadows
- `--background-color-transparent`: A partially-transparent background color used for overlays
- `--primary-action-foreground-color`: Color used for inputs/action buttons in the toolbar (e.g. a submit button).

</details>

Try the different CSS variables below:

```css,runnable
:root .imageEditorContainer {
    /* Used for unselected buttons and dialog text. */
	--background-color-1: white;
	--foreground-color-1: black;

	/* Used for some menu/toolbar backgrounds. */
	--background-color-2: #f5f5f5;
	--foreground-color-2: #2c303a;

	/* Used for other menu/toolbar backgrounds. */
	--background-color-3: #e5e5e5;
	--foreground-color-3: #1c202a;

	/* Used for selected buttons. */
	--selection-background-color: #cbdaf1;
	--selection-foreground-color: #2c303a;

	/* Used for dialog backgrounds */
	--background-color-transparent: rgba(105, 100, 100, 0.5);

	/* Used for shadows */
	--shadow-color: rgba(0, 0, 0, 0.5);

	/* Color used for some button/input foregrounds */
	--primary-action-foreground-color: #15b;
}

---ts---
import { Editor, makeEdgeToolbar, makeDropdownToolbar } from 'js-draw';
import 'js-draw/styles';
import { MaterialIconProvider } from '@js-draw/material-icons';



const makeToolbar = (newToolbar: boolean, editor: Editor) => {
	const toolbar = newToolbar ? makeEdgeToolbar(editor) : makeDropdownToolbar(editor);
	toolbar.addDefaults();

	toolbar.addExitButton(() => {
		alert('Not implemented for this editor!');
	});

	toolbar.addSaveButton(() => {
		const saveData = editor.toSVG().outerHTML;

		// Do something with saveData
		alert('Not implemented for this editor!');
	});

	return toolbar;
};

const makeEditor = async () => {
	const editor = new Editor(document.body, {
		iconProvider: new MaterialIconProvider(),
    	wheelEventsEnabled: 'only-if-focused',
	});

	// Loads from SVG data
	await editor.loadFromSVG(`
		<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
			<style id="js-draw-style-sheet">path{stroke-linecap:round;stroke-linejoin:round;}text{white-space:pre;}</style>
			<path d="M500,500L500,0L0,0L0,500L500,500" fill="#e3e3e3" class="js-draw-image-background"></path>
			<text style="transform: matrix(1, 0, 0, 1, 57, 192); font-family: sans-serif; font-size: 32px; fill: rgb(0, 0, 0);">Testing...</text>
		</svg>
	`);

	let isNewToolbar = true;
	let toolbar = makeToolbar(isNewToolbar, editor);



	const toolbarSelector = document.createElement('button');
	toolbarSelector.innerText = 'Change toolbar type';
	document.body.appendChild(toolbarSelector);

	toolbarSelector.onclick = () => {
		isNewToolbar = !isNewToolbar;
		toolbar.remove();

		toolbar = makeToolbar(isNewToolbar, editor);
	};
};

makeEditor();
```

## Breaking UI change: [New default toolbar](https://personalizedrefrigerator.github.io/js-draw/typedoc/functions/js_draw.makeEdgeToolbar.html)

The toolbar added by `.addToolbar()` has changed. A version of the original toolbar is still available.

This runnable code block shows how to specify which toolbar should be used and how to switch between them:

```ts,runnable
import {
	Editor, makeEdgeToolbar, makeDropdownToolbar, AbstractToolbar
} from 'js-draw';
import 'js-draw/styles';

// Also use the new icon pack:
import { MaterialIconProvider } from '@js-draw/material-icons';

let toolbar: AbstractToolbar|null = null
let isDropdownToolbar: boolean = true;

const makeToolbar = (editor: Editor) => {
	// Remove the old toolbar (if any).
	if (toolbar) {
		toolbar.remove();
	}

	// Create the new toolbar
	if (isDropdownToolbar) {
		toolbar = makeDropdownToolbar(editor);
	} else {
		toolbar = makeEdgeToolbar(editor);
	}

	// Add the default action buttons to the toolbar
	toolbar.addDefaults();

	// Add a toggle button
	toolbar.addActionButton({
		// An icon that looks similar to an arrow:
		icon: editor.icons.makeDropdownIcon(),
		label: 'Change toolbar type'
	}, () => {
		isDropdownToolbar = !isDropdownToolbar;
		makeToolbar(editor);
	});

	// Optional: Add save/exit buttons:
	// toolbar.addExitButton(() => { });
	// toolbar.addSaveButton(() => { });

	return toolbar;
};

// Creates the edior and adds it to the document
const makeEditor = () => {
	const editor = new Editor(document.body, {
		iconProvider: new MaterialIconProvider(),
    	wheelEventsEnabled: 'only-if-focused',
	});

	makeToolbar(editor);
};

makeEditor();
```

In summary, the `makeDropdownToolbar` and `makeEdgeToolbar` functions can be imported from `js-draw`
to create different types of toolbars.

Even in the dropdown toolbar, the behavior/appearance of many toolbar widgets are different.

## Breaking API change: Different `PenTool` API

The constructor for the `PenTool` has changed — rather than accepting the pen's default stroke factory
as a separate argument, the factory is a part of the `style` parameter.

The following demo shows how to create a pen tool:

```ts,runnable
import {
	Editor, PenTool, PenStyle, Color4,
	makeOutlinedCircleBuilder, makeFreehandLineBuilder
} from 'js-draw';
import 'js-draw/styles';

const editor = new Editor(document.body, {
    wheelEventsEnabled: 'only-if-focused',
});

const penStyle: PenStyle = {
	color: Color4.red,
	// Try changing this to makeFreehandLineBuilder
	factory: makeOutlinedCircleBuilder,
	thickness: 4,
};

editor.toolController.addPrimaryTool(
	new PenTool(editor, 'Some description here', penStyle),
);


// Add the toolbar **after** adding the new tool.
editor.addToolbar();
```

## Breaking API change: Timestamps now use `performance.now()`

Timestamps attached to events internal to the editor now use
[`performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) rather than
`Date.now()`. As such, these timestamps

- are relative to [`performance.timeOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin), not the UNIX epoch
- are not integers (but are still in milliseconds).
