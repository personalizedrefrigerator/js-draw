import { defaultEditorLocalization, EditorLocalization } from '../localization';

// German localization
const localization: EditorLocalization = {
	...defaultEditorLocalization,

	pen: 'Stift',
	eraser: 'Radierer',
	select: 'Auswahl',
	handTool: 'Verschieben',

	zoom: 'Vergrößerung',
	resetView: 'Ansicht zurücksetzen',

	thicknessLabel: 'Dicke: ',
	colorLabel: 'Farbe: ',
	fontLabel: 'Schriftart: ',

	resizeImageToSelection: 'Bildgröße an Auswahl anpassen',
	deleteSelection: 'Auswahl löschen',
	duplicateSelection: 'Auswahl duplizieren',

	undo: 'Rückgängig',
	redo: 'Wiederholen',

	pickColorFromScreen: 'Farbe von Bildschirm auswählen',
	clickToPickColorAnnouncement: 'Klicke auf den Bildschirm, um eine Farbe auszuwählen',
	selectionToolKeyboardShortcuts: 'Auswahl-Werkzeug: Verwende die Pfeiltasten, um ausgewählte Elemente zu verschieben und ‚i‘ und ‚o‘, um ihre Größe zu ändern.',
	touchPanning: 'Ansicht mit Touchscreen verschieben',
	anyDevicePanning: 'Ansicht mit jedem Eingabegerät verschieben',

	selectObjectType: 'Objekt-Typ: ',
	freehandPen: 'Freihand',
	arrowPen: 'Pfeil',
	linePen: 'Linie',
	outlinedRectanglePen: 'Umrissenes Rechteck',
	filledRectanglePen: 'Ausgefülltes Rechteck',

	dropdownShown: t=>`Dropdown-Menü für ${t} angezeigt`,
	dropdownHidden: t=>`Dropdown-Menü für ${t} versteckt`,
	zoomLevel: t=>`Vergößerung: ${t}%`,
	colorChangedAnnouncement: t=>`Farbe zu ${t} geändert`,
	penTool: t=>`Stift ${t}`,

	selectionTool: 'Auswahl',
	eraserTool: 'Radiergummi',
	touchPanTool: 'Ansicht mit Touchscreen verschieben',
	twoFingerPanZoomTool: 'Ansicht verschieben und vergrößern',
	undoRedoTool: 'Rückgängig/Wiederholen',
	rightClickDragPanTool: 'Rechtsklick-Ziehen',
	pipetteTool: 'Farbe von Bildschirm auswählen',
	keyboardPanZoom: 'Tastaturkürzel zum Verschieben/Vergrößern der Ansicht',
	textTool: 'Text',
	enterTextToInsert: 'Einzufügender Text',

	toolEnabledAnnouncement: t=>`${t} aktiviert`,
	toolDisabledAnnouncement: t=>`${t} deaktiviert`,
	updatedViewport: 'Transformierte Ansicht',
	transformedElements: t=>`${t} Element${1===t?'':'e'} transformiert`,
	resizeOutputCommand: t=>`Bildgröße auf ${t.w}x${t.h} geändert`,
	addElementAction: t=>`${t} hinzugefügt`,
	eraseAction: (t,e)=>`${e} ${t} gelöscht`,
	duplicateAction: (t,e)=>`${e} ${t} dupliziert`,
	inverseOf: t=>`Umkehrung von ${t}`,

	elements: 'Elemente',
	erasedNoElements: 'Nichts entfernt',
	duplicatedNoElements: 'Nichts dupliziert',
	rotatedBy: t=>`${Math.abs(t)} Grad ${t<0?'im Uhrzeigersinn':'gegen den Uhrzeigersinn'} gedreht`,

	movedLeft: 'Nacht links bewegt',
	movedUp: 'Nacht oben bewegt',
	movedDown: 'Nacht unten bewegt',
	movedRight: 'Nacht rechts bewegt',
	zoomedOut: 'Ansicht verkleinert',
	zoomedIn: 'Ansicht vergrößert',

	selectedElements: t=>`${t} Element${ 1===t ? '' : 'e' } ausgewählt`,
	stroke: 'Strich',
	svgObject: 'SVG-Objekt',

	text: t=>`Text-Objekt: ${t}`,
	pathNodeCount: t=>`Es gibt ${t} sichtbare Pfad-Objekte.`,
	textNodeCount: t=>`Es gibt ${t} sichtbare Text-Knotenpunkte.`,
	textNode: t=>`Text: ${t}`,

	rerenderAsText: 'Als Text darstellen',
	accessibilityInputInstructions: 'Drücke ‚t‘, um den Inhalt des Ansichtsfensters als Text zu lesen. Verwende die Pfeiltasten, um die Ansicht zu verschieben, und klicke und ziehe, um Striche zu zeichnen. Drücke ‚w‘ zum Vergrößern und ‚s‘ zum Verkleinern der Ansicht.',

	loading: t=>`Laden ${t}%...`,
	doneLoading: 'Laden fertig',

	imageEditor: 'Bild-Editor',
	undoAnnouncement: t=>`Rückgangig gemacht ${t}`,
	redoAnnouncement: t=>`Wiederholt ${t}`,
};

export default localization;