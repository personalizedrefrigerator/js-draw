export enum ToolbarButtonType {
	ToggleButton,
	ActionButton,
}


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
