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
	inputAltText: 'Alt-Text: ',
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
	selectionToolKeyboardShortcuts:
		'Auswahl-Werkzeug: Verwende die Pfeiltasten, um ausgewählte Elemente zu verschieben und ‚i‘ und ‚o‘, um ihre Größe zu ändern.',
	touchPanning: 'Ansicht mit Touchscreen verschieben',
	anyDevicePanning: 'Ansicht mit jedem Eingabegerät verschieben',

	selectPenType: 'Objekt-Typ: ',
	roundedTipPen: 'Freihand',
	flatTipPen: 'Stift (druckempfindlich)',
	arrowPen: 'Pfeil',
	linePen: 'Linie',
	outlinedRectanglePen: 'Umrissenes Rechteck',
	filledRectanglePen: 'Ausgefülltes Rechteck',

	lockRotation: 'Sperre Rotation',
	paste: 'Einfügen',

	dropdownShown: (toolName) => `Dropdown-Menü für ${toolName} angezeigt`,
	dropdownHidden: (toolName) => `Dropdown-Menü für ${toolName} versteckt`,
	zoomLevel: (zoomPercent) => `Vergößerung: ${zoomPercent}%`,
	colorChangedAnnouncement: (color) => `Farbe zu ${color} geändert`,

	imageSize: (size, units) => `Bild-Größe: ${size} ${units}`,
	imageLoadError: (message) => `Fehler beim Laden des Bildes: ${message}`,
	errorImageHasZeroSize: 'Fehler: Bild hat Größe Null',

	penTool: (penNumber) => `Stift ${penNumber}`,

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
	closeDialog: 'Schließen',
	findDialogShown: 'Finde-Dialog angezeigt',
	findDialogHidden: 'Finde-Dialog versteckt',
	focusedFoundText: (matchIdx, totalMatches) => `Sieh Treffer ${matchIdx} von ${totalMatches} an`,

	toolEnabledAnnouncement: (toolName) => `${toolName} aktiviert`,
	toolDisabledAnnouncement: (toolName) => `${toolName} deaktiviert`,
	updatedViewport: 'Transformierte Ansicht',
	transformedElements: (elemCount) =>
		`${elemCount} Element${1 === elemCount ? '' : 'e'} transformiert`,
	resizeOutputCommand: (newSize) => `Bildgröße auf ${newSize.w}x${newSize.h} geändert`,
	addComponentAction: (componentDescription) => `${componentDescription} hinzugefügt`,
	eraseAction: (elemDescription, countErased) => `${countErased} ${elemDescription} gelöscht`,
	duplicateAction: (elemDescription, countErased) => `${countErased} ${elemDescription} dupliziert`,
	inverseOf: (actionDescription) => `${actionDescription} umgekehrt`,

	elements: 'Elemente',
	erasedNoElements: 'Nichts entfernt',
	duplicatedNoElements: 'Nichts dupliziert',
	rotatedBy: (degrees) =>
		`${Math.abs(degrees)} Grad ${degrees < 0 ? 'im Uhrzeigersinn' : 'gegen den Uhrzeigersinn'} gedreht`,

	movedLeft: 'Nacht links bewegt',
	movedUp: 'Nacht oben bewegt',
	movedDown: 'Nacht unten bewegt',
	movedRight: 'Nacht rechts bewegt',
	zoomedOut: 'Ansicht verkleinert',
	zoomedIn: 'Ansicht vergrößert',

	selectedElements: (count) => `${count} Element${1 === count ? '' : 'e'} ausgewählt`,
	stroke: 'Strich',
	svgObject: 'SVG-Objekt',

	text: (text) => `Text-Objekt: ${text}`,
	pathNodeCount: (count) => `Es gibt ${count} sichtbare Pfad-Objekte.`,
	textNodeCount: (count) => `Es gibt ${count} sichtbare Text-Knotenpunkte.`,
	textNode: (content) => `Text: ${content}`,

	imageNodeCount: (nodeCount) => `Es gibt ${nodeCount} sichtbare Bild-Knoten.`,
	imageNode: (label) => `Bild: ${label}`,
	unlabeledImageNode: 'Bild ohne Label',

	rerenderAsText: 'Als Text darstellen',
	accessibilityInputInstructions:
		'Drücke ‚t‘, um den Inhalt des Ansichtsfensters als Text zu lesen. Verwende die Pfeiltasten, um die Ansicht zu verschieben, und klicke und ziehe, um Striche zu zeichnen. Drücke ‚w‘ zum Vergrößern und ‚s‘ zum Verkleinern der Ansicht.',

	loading: (percentage) => `Laden ${percentage}%...`,
	doneLoading: 'Laden fertig',

	imageEditor: 'Bild-Editor',
	undoAnnouncement: (commandDescription) => `${commandDescription} rückgängig gemacht`,
	redoAnnouncement: (commandDescription) => `${commandDescription} wiederholt`,
	reformatSelection: 'Formatiere Auswahl',
	documentProperties: 'Seite',
	backgroundColor: 'Hintergrundfarbe: ',
	imageWidthOption: 'Breite: ',
	imageHeightOption: 'Höhe: ',
	useGridOption: 'Gitter: ',
	toggleOverflow: 'Mehr',
	selectAllTool: 'Alle auswählen',
	soundExplorer: 'Klangbasierte Bilderkundung',
	disableAccessibilityExploreTool: 'Deaktiviere klangbasierte Erkundung',
	enableAccessibilityExploreTool: 'Aktiviere klangbasierte Erkundung',
	unionOf: (actionDescription, actionCount) => `Vereinigung: ${actionCount} ${actionDescription}`,
	emptyBackground: 'Leerer Hintergrund',
	filledBackgroundWithColor: (color) => `Gefüllter Hintergrund (${color})`,
	restyledElement: (elementDescription) => `${elementDescription} umgestaltet`,
};

export default localization;
