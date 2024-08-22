import { ToolbarUtilsLocalization, defaultToolbarUtilsLocalization } from './utils/localization';

export interface ToolbarLocalization extends ToolbarUtilsLocalization {
	fontLabel: string;
	textSize: string;
	touchPanning: string;
	lockRotation: string;
	outlinedRectanglePen: string;
	outlinedCirclePen: string,
	filledRectanglePen: string;
	linePen: string;
	arrowPen: string;
	image: string;
	inputAltText: string;
	decreaseImageSize: string;
	resetImage: string;
	chooseFile: string;
	dragAndDropHereOrBrowse: string; // Uses {{curly braces}} to bold text
	cancel: string;
	submit: string;
	addAll: string;
	roundedTipPen: string;
	roundedTipPen2: string;
	flatTipPen: string;
	selectPenType: string;
	selectShape: string;
	colorLabel: string;
	pen: string;
	eraser: string;
	select: string;
	handTool: string;
	thicknessLabel: string;
	resizeImageToSelection: string;
	deleteSelection: string;
	duplicateSelection: string;
	fullStrokeEraser: string;

	pickColorFromScreen: string;
	clickToPickColorAnnouncement: string;
	colorSelectionCanceledAnnouncement: string;

	undo: string;
	redo: string;
	exit: string;
	save: string;

	zoom: string;
	resetView: string;
	reformatSelection: string;
	selectionToolKeyboardShortcuts: string;
	copyButton__paste: string;
	copyButton__copy: string;
	copyButton__copied: string;
	documentProperties: string;
	backgroundColor: string;
	imageWidthOption: string;
	imageHeightOption: string;
	useGridOption: string;
	enableAutoresizeOption: string;
	toggleOverflow: string,

	about: string;
	inputStabilization: string;
	strokeAutocorrect: string;

	errorImageHasZeroSize: string;
	describeTheImage: string;

	fileInput__loading: string;
	fileInput__andNMoreFiles: (count: number)=>string;

	// Help text
	penDropdown__baseHelpText: string;
	penDropdown__colorHelpText: string;
	penDropdown__thicknessHelpText: string;
	penDropdown__penTypeHelpText: string;
	penDropdown__autocorrectHelpText: string;
	penDropdown__stabilizationHelpText: string;
	handDropdown__baseHelpText: string;
	handDropdown__zoomDisplayHelpText: string;
	handDropdown__zoomInHelpText: string;
	handDropdown__zoomOutHelpText: string;
	handDropdown__resetViewHelpText: string;
	handDropdown__touchPanningHelpText: string;
	eraserDropdown__baseHelpText: string;
	eraserDropdown__fullStrokeEraserHelpText: string;
	handDropdown__lockRotationHelpText: string;
	eraserDropdown__thicknessHelpText: string;
	selectionDropdown__baseHelpText: string;
	selectionDropdown__resizeToHelpText: string;
	selectionDropdown__deleteHelpText: string;
	selectionDropdown__duplicateHelpText: string;
	selectionDropdown__changeColorHelpText: string;
	pageDropdown__baseHelpText: string;
	pageDropdown__backgroundColorHelpText: string;
	pageDropdown__gridCheckboxHelpText: string;
	pageDropdown__aboutButtonHelpText: string;
	pageDropdown__autoresizeCheckboxHelpText: string;
	colorPickerPipetteHelpText: string;
	colorPickerToggleHelpText: string;

	// closeSidebar is used for accessibility in a button label.
	closeSidebar: (toolName: string)=>string;
	dropdownShown: (toolName: string)=> string;
	dropdownHidden: (toolName: string)=> string;

	zoomLevel: (zoomPercentage: number)=> string;
	colorChangedAnnouncement: (color: string)=> string;
	imageSize: (size: number, units: string)=> string;
	imageLoadError: (message: string)=> string;
}

export const defaultToolbarLocalization: ToolbarLocalization = {
	...defaultToolbarUtilsLocalization,

	pen: 'Pen',
	eraser: 'Eraser',
	select: 'Select',
	handTool: 'Pan',
	zoom: 'Zoom',
	image: 'Image',
	reformatSelection: 'Format selection',
	inputAltText: 'Alt text',
	decreaseImageSize: 'Decrease size',
	resetImage: 'Reset',
	chooseFile: 'Choose file',
	dragAndDropHereOrBrowse: 'Drag and drop here\nor\n{{browse}}',
	submit: 'Submit',
	addAll: 'Add all',
	cancel: 'Cancel',
	resetView: 'Reset view',
	thicknessLabel: 'Thickness',
	colorLabel: 'Color',
	fontLabel: 'Font',
	textSize: 'Size',
	resizeImageToSelection: 'Resize image to selection',
	deleteSelection: 'Delete selection',
	duplicateSelection: 'Duplicate selection',

	exit: 'Exit',
	save: 'Save',
	undo: 'Undo',
	redo: 'Redo',

	fullStrokeEraser: 'Full stroke eraser',
	selectPenType: 'Pen type',
	selectShape: 'Shape',
	pickColorFromScreen: 'Pick color from screen',
	clickToPickColorAnnouncement: 'Click on the screen to pick a color',
	colorSelectionCanceledAnnouncement: 'Color selection canceled',
	selectionToolKeyboardShortcuts: 'Selection tool: Use arrow keys to move selected items, lowercase/uppercase ‘i’ and ‘o’ to resize.',
	documentProperties: 'Page',
	backgroundColor: 'Background color',
	imageWidthOption: 'Width',
	imageHeightOption: 'Height',
	useGridOption: 'Grid',
	enableAutoresizeOption: 'Auto-resize',
	toggleOverflow: 'More',
	about: 'About',
	inputStabilization: 'Stabilization',
	strokeAutocorrect: 'Autocorrect',

	touchPanning: 'Touchscreen panning',

	roundedTipPen: 'Round',
	roundedTipPen2: 'Polyline',
	flatTipPen: 'Flat',
	arrowPen: 'Arrow',
	linePen: 'Line',
	outlinedRectanglePen: 'Outlined rectangle',
	filledRectanglePen: 'Filled rectangle',
	outlinedCirclePen: 'Outlined circle',
	lockRotation: 'Lock rotation',

	copyButton__paste: 'Paste',
	copyButton__copy: 'Copy to clipboard',
	copyButton__copied: 'Copied',

	errorImageHasZeroSize: 'Error: Image has zero size',
	describeTheImage: 'Image description',

	fileInput__loading: 'Loading...',
	fileInput__andNMoreFiles: (n: number) => `(...${n} more)`,

	// Help text
	penDropdown__baseHelpText: 'This tool draws shapes or freehand lines.',
	penDropdown__colorHelpText: 'Changes the pen\'s color',
	penDropdown__thicknessHelpText:
		'Changes the thickness of strokes drawn by the pen.',
	penDropdown__penTypeHelpText: 'Changes the pen style.\n\nEither a “pen” style or “shape” can be chosen. Choosing a “pen” style draws freehand lines. Choosing a “shape” draws shapes.',
	penDropdown__autocorrectHelpText:
		'Converts approximate freehand lines and rectangles to perfect ones.\n\nThe pen must be held stationary at the end of a stroke to trigger a correction.',
	penDropdown__stabilizationHelpText:
		'Draws smoother strokes.\n\nThis also adds a short delay between the mouse/stylus and the stroke.',
	handDropdown__baseHelpText:
		'This tool is responsible for scrolling, rotating, and zooming the editor.',
	handDropdown__zoomInHelpText: 'Zooms in.',
	handDropdown__zoomOutHelpText: 'Zooms out.',
	handDropdown__resetViewHelpText:
		'Resets the zoom level to 100% and resets scroll.',
	handDropdown__zoomDisplayHelpText:
		'Shows the current zoom level. 100% shows the image at its actual size.',
	handDropdown__touchPanningHelpText:
		'When enabled, touch gestures move the image rather than select or draw.',
	handDropdown__lockRotationHelpText:
		'When enabled, prevents touch gestures from rotating the screen.',
	eraserDropdown__baseHelpText: 'This tool removes strokes, images, and text under the cursor.',
	eraserDropdown__thicknessHelpText: 'Changes the size of the eraser.',
	eraserDropdown__fullStrokeEraserHelpText:
		'When in full-stroke mode, entire shapes are erased.\n\nWhen not in full-stroke mode, shapes can be partially erased.',
	selectionDropdown__baseHelpText: 'Selects content and manipulates the selection',
	selectionDropdown__resizeToHelpText: 'Crops the drawing to the size of what\'s currently selected.\n\nIf auto-resize is enabled, it will be disabled.',
	selectionDropdown__deleteHelpText: 'Erases selected items.',
	selectionDropdown__duplicateHelpText: 'Makes a copy of selected items.',
	selectionDropdown__changeColorHelpText: 'Changes the color of selected items.',
	pageDropdown__baseHelpText: 'Controls the drawing canvas\' background color, pattern, and size.',
	pageDropdown__backgroundColorHelpText: 'Changes the background color of the drawing canvas.',
	pageDropdown__gridCheckboxHelpText: 'Enables/disables a background grid pattern.',
	pageDropdown__autoresizeCheckboxHelpText: 'When checked, the page grows to fit the drawing.\n\nWhen unchecked, the page is visible and its size can be set manually.',
	pageDropdown__aboutButtonHelpText: 'Shows version, debug, and other information.',
	colorPickerPipetteHelpText: 'Picks a color from the screen.',
	colorPickerToggleHelpText: 'Opens/closes the color picker.',

	closeSidebar: (toolName: string) => `Close sidebar for ${toolName}`,
	dropdownShown: (toolName) => `Menu for ${toolName} shown`,
	dropdownHidden: (toolName) => `Menu for ${toolName} hidden`,

	zoomLevel: (zoomPercent: number) => `Zoom: ${zoomPercent}%`,
	colorChangedAnnouncement: (color: string) => `Color changed to ${color}`,
	imageSize: (size: number, units: string) => `Image size: ${size} ${units}`,

	imageLoadError: (message: string)=> `Error loading image: ${message}`,
};
