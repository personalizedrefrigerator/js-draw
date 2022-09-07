

export interface ToolbarLocalization {
	fontLabel: string;
	anyDevicePanning: string;
	touchPanning: string;
	outlinedRectanglePen: string;
	filledRectanglePen: string;
	linePen: string;
	arrowPen: string;
	freehandPen: string;
	selectObjectType: string;
	colorLabel: string;
	pen: string;
	eraser: string;
	select: string;
	handTool: string;
	thicknessLabel: string;
	resizeImageToSelection: string;
	deleteSelection: string;
	undo: string;
	redo: string;
	zoom: string;

	dropdownShown: (toolName: string)=>string;
	dropdownHidden: (toolName: string)=>string;
	zoomLevel: (zoomPercentage: number)=> string;
}

export const defaultToolbarLocalization: ToolbarLocalization = {
	pen: 'Pen',
	eraser: 'Eraser',
	select: 'Select',
	handTool: 'Pan',
	zoom: 'Zoom',
	thicknessLabel: 'Thickness: ',
	colorLabel: 'Color: ',
	fontLabel: 'Font: ',
	resizeImageToSelection: 'Resize image to selection',
	deleteSelection: 'Delete selection',
	undo: 'Undo',
	redo: 'Redo',
	selectObjectType: 'Object type: ',

	touchPanning: 'Touchscreen panning',
	anyDevicePanning: 'Any device panning',

	freehandPen: 'Freehand',
	arrowPen: 'Arrow',
	linePen: 'Line',
	outlinedRectanglePen: 'Outlined rectangle',
	filledRectanglePen: 'Filled rectangle',

	dropdownShown: (toolName) => `Dropdown for ${toolName} shown`,
	dropdownHidden: (toolName) => `Dropdown for ${toolName} hidden`,
	zoomLevel: (zoomPercent: number) => `Zoom: ${zoomPercent}%`,
};
