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
	roundedTipPen: string;
	flatTipPen: string;
	selectPenTip: string;
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
	paste: string;
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
	handDropdown__lockRotationHelpText: string;
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

	selectPenTip: 'Pen tip',
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
	flatTipPen: 'Flat',
	arrowPen: 'Arrow',
	linePen: 'Line',
	outlinedRectanglePen: 'Outlined rectangle',
	filledRectanglePen: 'Filled rectangle',
	outlinedCirclePen: 'Outlined circle',
	lockRotation: 'Lock rotation',

	paste: 'Paste',

	errorImageHasZeroSize: 'Error: Image has zero size',

	// Help text
	penDropdown__baseHelpText: 'This tool draws shapes or freehand lines.',
	penDropdown__colorHelpText: 'Changes the pen\'s color',
	penDropdown__thicknessHelpText:
		'Changes the thickness of strokes drawn by the pen.',
	penDropdown__penTypeHelpText: 'Changes the pen style.\n\nChoosing a “pen tip” style draws freehand lines. Choosing a “shape” draws shapes.',
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
