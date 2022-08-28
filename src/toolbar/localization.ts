

export interface ToolbarLocalization {
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
	touchDrawing: string;
	thicknessLabel: string;
	resizeImageToSelection: string;
	undo: string;
	redo: string;

	dropdownShown: (toolName: string)=>string;
	dropdownHidden: (toolName: string)=>string;
}

export const defaultToolbarLocalization: ToolbarLocalization = {
	pen: 'Pen',
	eraser: 'Eraser',
	select: 'Select',
	touchDrawing: 'Touch Drawing',
	thicknessLabel: 'Thickness: ',
	colorLabel: 'Color: ',
	resizeImageToSelection: 'Resize image to selection',
	undo: 'Undo',
	redo: 'Redo',
	selectObjectType: 'Object type: ',

	freehandPen: 'Freehand',
	arrowPen: 'Arrow',
	linePen: 'Line',
	outlinedRectanglePen: 'Outlined rectangle',
	filledRectanglePen: 'Filled rectangle',

	dropdownShown: (toolName) => `Dropdown for ${toolName} shown`,
	dropdownHidden: (toolName) => `Dropdown for ${toolName} hidden`,
};
