import { defaultEditorLocalization, EditorLocalization } from '../localization';

// A partial Spanish localization.
const localization: EditorLocalization = {
	...defaultEditorLocalization,

	// Strings for the main editor interface
	// (see src/localization.ts)
	loading: (percentage: number) => `Cargando: ${percentage}%...`,
	imageEditor: 'Editor de dibujos',

	undoAnnouncement: (commandDescription: string) => `${commandDescription} fue deshecho`,
	redoAnnouncement: (commandDescription: string) => `${commandDescription} fue rehecho`,
	undo: 'Deshace',
	redo: 'Rehace',

	// Strings for the toolbar
	// (see src/toolbar/localization.ts)
	pen: 'Lapiz',
	eraser: 'Borrador',
	select: 'Selecciona',
	thicknessLabel: 'Tamaño: ',
	colorLabel: 'Color: ',
	doneLoading: 'El cargado terminó',
	fontLabel: 'Fuente: ',
	anyDevicePanning: 'Mover la pantalla con todo dispotivo',
	touchPanning: 'Mover la pantalla con un dedo',
	touchPanTool: 'Instrumento de mover la pantalla con un dedo',
	outlinedRectanglePen: 'Rectángulo con nada más que un borde',
	filledRectanglePen: 'Rectángulo sin borde',
	linePen: 'Línea',
	arrowPen: 'Flecha',
	freehandPen: 'Dibuja sin restricción de forma',
	selectPenType: 'Forma de dibuja:',
	handTool: 'Mover',
	zoom: 'Zoom',
	resetView: 'Reiniciar vista',
	resizeImageToSelection: 'Redimensionar la imagen a lo que está seleccionado',
	deleteSelection: 'Borra la selección',
	duplicateSelection: 'Duplica la selección',
	pickColorFromScreen: 'Selecciona un color de la pantalla',
	clickToPickColorAnnouncement: 'Haga un clic en la pantalla para seleccionar un color',
	dropdownShown(toolName: string): string {
		return `Menú por ${toolName} es visible`;
	},
	dropdownHidden: function (toolName: string): string {
		return `Menú por ${toolName} fue ocultado`;
	},
	colorChangedAnnouncement: function (color: string): string {
		return `Color fue cambiado a ${color}`;
	},
	keyboardPanZoom: 'Mover la pantalla con el teclado',
	penTool: function (penId: number): string {
		return `Lapiz ${penId}`;
	},
	selectionTool: 'Selecciona',
	eraserTool: 'Borrador',
	textTool: 'Texto',
	enterTextToInsert: 'Entra texto',
	textSize: 'Tamaño',
	rerenderAsText: 'Redibuja la pantalla al texto',
	lockRotation: 'Bloquea rotación',
	image: 'Imagen',
	imageSize: (size: number, units: string) => `Tamaño del imagen: ${size} ${units}`,
	imageLoadError: (message: string)=> `Error cargando imagen: ${message}`,
	toggleOverflow: 'Más',

	documentProperties: 'Fondo',
	imageWidthOption: 'Ancho: ',
	imageHeightOption: 'Alto: ',
	backgroundColor: 'Color de fondo: '
};

export default localization;