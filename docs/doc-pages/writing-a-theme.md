# Writing a theme for `js-draw`

`js-draw` derives its colors from a set of CSS variables. By default, these variables are automatically
set based on whether the user's browser is in dark mode
(using [the CSS `prefers-color-scheme` `@media` selector](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)). 

Here's a runnable example:
```css,runnable
/* A yellowish theme! */

:root .imageEditorContainer {
	/* Try changing the below values and clicking run again! */
    /* Unselected buttons and dialog text. */
	--background-color-1: #ffff77;
	--foreground-color-1: black;

	/* Some menu/toolbar backgrounds. */
	--background-color-2: #ffff99;
	--foreground-color-2: #111;

	/* menu/toolbar backgrounds. */
	--background-color-3: #ffffaa;
	--foreground-color-3: #121100;

	/* Used for selected buttons. */
	--selection-background-color: #9f7;
	--selection-foreground-color: #00f;

	/* Used for dialog backgrounds */
	--background-color-transparent: rgba(0, 0, 100, 0.5);

	/* Used for shadows */
	--shadow-color: rgba(0, 0, 0, 0.5);

	/* Color used for some button/input foregrounds */
	--primary-action-foreground-color: #f00;

	/* Use light mode for controls. */
	color-scheme: light;
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

	// Template generated with https://js-draw.web.app/
	await editor.loadFromSVG(`
		<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
			<g class="js-draw-image-background js-draw-image-background-grid js-draw-image-background-grid-25">
				<path d="M500,500L500,0L0,0L0,500L500,500" fill="#f1ffa4"></path>
				<path d="M0,0L500,0M0,25L500,25M0,50L500,50M0,75L500,75M0,100L500,100M0,125L500,125M0,150L500,150M0,175L500,175M0,200L500,200M0,225L500,225M0,250L500,250M0,275L500,275M0,300L500,300M0,325L500,325M0,350L500,350M0,375L500,375M0,400L500,400M0,425L500,425M0,450L500,450M0,475L500,475M0,500L500,500M0,0L0,500M25,0L25,500M50,0L50,500M75,0L75,500M100,0L100,500M125,0L125,500M150,0L150,500M175,0L175,500M200,0L200,500M225,0L225,500M250,0L250,500M275,0L275,500M300,0L300,500M325,0L325,500M350,0L350,500M375,0L375,500M400,0L400,500M425,0L425,500M450,0L450,500M475,0L475,500M500,0L500,500" fill="none" stroke="#0e005b33" stroke-width=".7"></path>
			</g>
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

Notice the `:root` prefix — this adds specificity to the selectors to ensure that they override
the defaults.


**See also**
 - **To auto-adjust theme colors to improve contrast:** {@link js-draw.adjustEditorThemeForContrast}
 - **To customize the icons used by `js-draw`**: {@link js-draw.IconProvider} and {@link "@js-draw/material-icons"}