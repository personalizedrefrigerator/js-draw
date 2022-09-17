---
name: Translation
about: Translate the editor to a new language!
title: ''
labels: localization
assignees: ''

---

# Language name in English
[e.g. Spanish]

# Translations
Please translate each of the strings in the right column (everything after the `: `) into the target language.

Ignore the surrounding single quotes. For example, to translate `insertDrawing: 'Insert Drawing',` to Spanish, please replace it with `insertDrawing: 'Añada dibujo',`.

If you're updating an existing translation, please only include the strings you're translating. Similarly, if you don't want to provide localizations for an entire language, only include the strings you did translate.

	pen: "Pen",
	eraser: "Eraser",
	select: "Select",
	handTool: "Pan",
	zoom: "Zoom",
	resetView: "Reset view",
	thicknessLabel: "Thickness: ",
	colorLabel: "Color: ",
	fontLabel: "Font: ",
	resizeImageToSelection: "Resize image to selection",
	deleteSelection: "Delete selection",
	duplicateSelection: "Duplicate selection",
	undo: "Undo",
	redo: "Redo",
	selectObjectType: "Object type: ",
	pickColorFromScreen: "Pick color from screen",
	clickToPickColorAnnouncement: "Click on the screen to pick a color",
	selectionToolKeyboardShortcuts: "Selection tool: Use arrow keys to move selected items, lowercase/uppercase ‘i’ and ‘o’ to resize.",
	touchPanning: "Touchscreen panning",
	anyDevicePanning: "Any device panning",
	freehandPen: "Freehand",
	arrowPen: "Arrow",
	linePen: "Line",
	outlinedRectanglePen: "Outlined rectangle",
	filledRectanglePen: "Filled rectangle",
	dropdownShown: t=>`Dropdown for ${t} shown`,
	dropdownHidden: t=>`Dropdown for ${t} hidden`,
	zoomLevel: t=>`Zoom: ${t}%`,
	colorChangedAnnouncement: t=>`Color changed to ${t}`,
	penTool: t=>`Pen ${t}`,
	selectionTool: "Selection",
	eraserTool: "Eraser",
	touchPanTool: "Touch panning",
	twoFingerPanZoomTool: "Panning and zooming",
	undoRedoTool: "Undo/Redo",
	rightClickDragPanTool: "Right-click drag",
	pipetteTool: "Pick color from screen",
	keyboardPanZoom: "Keyboard pan/zoom shortcuts",
	textTool: "Text",
	enterTextToInsert: "Text to insert",
	toolEnabledAnnouncement: t=>`${t} enabled`,
	toolDisabledAnnouncement: t=>`${t} disabled`,
	updatedViewport: "Transformed Viewport",
	transformedElements: t=>`Transformed ${t} element${1===t?"":"s"}`,
	resizeOutputCommand: t=>`Resized image to ${t.w}x${t.h}`,
	addElementAction: t=>`Added ${t}`,
	eraseAction: (elemDescription, countErased)=>`Erased ${countErased} ${elemDescription}`,
	duplicateAction: (elemDescription, countErased)=>`Duplicated ${countErased} ${elemDescription}`,
	inverseOf: t=>`Inverse of ${t}`,
	elements: "Elements",
	erasedNoElements: "Erased nothing",
	duplicatedNoElements: "Duplicated nothing",
	rotatedBy: t=>`Rotated by ${Math.abs(t)} degrees ${t<0?"clockwise":"counter-clockwise"}`,
	movedLeft: "Moved left",
	movedUp: "Moved up",
	movedDown: "Moved down",
	movedRight: "Moved right",
	zoomedOut: "Zoomed out",
	zoomedIn: "Zoomed in",
	selectedElements: t=>`Selected ${t} element${ 1===t ? "" : "s" }`,
	stroke: "Stroke",
	svgObject: "SVG Object",
	text: t=>`Text object: ${t}`,
	pathNodeCount: t=>`There are ${t} visible path objects.`,
	textNodeCount: t=>`There are ${t} visible text nodes.`,
	textNode: t=>`Text: ${t}`,
	rerenderAsText: "Re-render as text",
	accessibilityInputInstructions: "Press \"t\" to read the contents of the viewport as text. Use the arrow keys to move the viewport, click and drag to draw strokes. Press \"w\" to zoom in and \"s\" to zoom out.",
	loading: t=>`Loading ${t}%...`,
	imageEditor: "Image Editor",
	doneLoading: "Done loading",
	undoAnnouncement: t=>`Undid ${t}`,
	redoAnnouncement: t=>`Redid ${t}`,

<!--
 If you have development expierence and are comfortable creating a pull request, please consider doing so — the language can be added to ./src/localizations/.
-->
