import { defaultEditorLocalization, EditorLocalization } from '../localization';

// German localization
const localization: EditorLocalization = {
	...defaultEditorLocalization,

	pen: 'Stift',
	eraser: 'Radierer',
	select: 'Auswahl',
	handTool: 'Verschieben',

	zoom: 'Vergrößerung',
	
	image: 'Bild',
	inputAltText: 'Alt text: ',
	chooseFile: 'Wähle Datei: ',
	submit: 'Absenden',
	cancel: 'Abbrechen',
	
	resetView: 'Ansicht zurücksetzen',

	thicknessLabel: 'Dicke: ',
	colorLabel: 'Farbe: ',
	fontLabel: 'Schriftart: ',
	textSize: 'Größe: ',

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

	selectPenType: 'Objekt-Typ: ',
	freehandPen: 'Freihand',
	pressureSensitiveFreehandPen: "Stift (druckempfindlich)",
	arrowPen: 'Pfeil',
	linePen: 'Linie',
	outlinedRectanglePen: 'Umrissenes Rechteck',
	filledRectanglePen: 'Ausgefülltes Rechteck',
	
	lockRotation: 'Sperre Rotation',
	paste: 'Einfügen',

	dropdownShown: t=>`Dropdown-Menü für ${t} angezeigt`,
	dropdownHidden: t=>`Dropdown-Menü für ${t} versteckt`,
	zoomLevel: t=>`Vergößerung: ${t}%`,
	colorChangedAnnouncement: t=>`Farbe zu ${t} geändert`,
	
	imageSize: (size, units) => `Bild-Größe: ${size} ${units}`,
	imageLoadError: (message) => `Fehler beim laden des Bildes: ${message}`,
	
	penTool: penNumber =>`Stift ${penNumber}`,

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
	changeTool: 'Wechsle Werkzeug',
	pasteHandler: 'Copy-Paste-Handler',
	findLabel: 'Finde',
	toNextMatch: 'Nächstes',
	closeFindDialog: 'Schließen',
	findDialogShown: 'Finde-Dialog angezeigt',
	findDialogHidden: 'Finde-Dialog versteckt',
	focusedFoundText: (matchIdx, totalMatches) => `Sieh Treffer ${matchIdx} von ${totalMatches} an`,

	toolEnabledAnnouncement: t=>`${t} aktiviert`,
	toolDisabledAnnouncement: t=>`${t} deaktiviert`,
	updatedViewport: 'Transformierte Ansicht',
	transformedElements: t=>`${t} Element${1===t?'':'e'} transformiert`,
	resizeOutputCommand: t=>`Bildgröße auf ${t.w}x${t.h} geändert`,
	addElementAction: t=>`${t} hinzugefügt`,
	eraseAction: (elemDescription, countErased)=>`${countErased} ${elemDescription} gelöscht`,
	duplicateAction: (elemDescription, countErased)=>`${countErased} ${elemDescription} dupliziert`,
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
	
	imageNodeCount: nodeCount => `Es gibt ${nodeCount} sichtbare Bild-Knoten.`,
	imageNode: label => `Bild: ${label}`,
	unlabeledImageNode: 'Bild ohne Label',

	rerenderAsText: 'Als Text darstellen',
	accessibilityInputInstructions: 'Drücke ‚t‘, um den Inhalt des Ansichtsfensters als Text zu lesen. Verwende die Pfeiltasten, um die Ansicht zu verschieben, und klicke und ziehe, um Striche zu zeichnen. Drücke ‚w‘ zum Vergrößern und ‚s‘ zum Verkleinern der Ansicht.',

	loading: percentage =>`Laden ${percentage}%...`,
	doneLoading: 'Laden fertig',

	imageEditor: 'Bild-Editor',
	undoAnnouncement: t=>`Rückgangig gemacht ${t}`,
	redoAnnouncement: t=>`Wiederholt ${t}`,
};

export default localization;
