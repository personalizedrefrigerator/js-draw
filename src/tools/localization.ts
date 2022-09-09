
export interface ToolLocalization {
	keyboardPanZoom: string;
    penTool: (penId: number)=>string;
    selectionTool: string;
    eraserTool: string;
    touchPanTool: string;
    twoFingerPanZoomTool: string;
    undoRedoTool: string;
	pipetteTool: string;
	rightClickDragPanTool: string;

	textTool: string;
	enterTextToInsert: string;

    toolEnabledAnnouncement: (toolName: string) => string;
    toolDisabledAnnouncement: (toolName: string) => string;
}

export const defaultToolLocalization: ToolLocalization = {
	penTool: (penId) => `Pen ${penId}`,
	selectionTool: 'Selection',
	eraserTool: 'Eraser',
	touchPanTool: 'Touch panning',
	twoFingerPanZoomTool: 'Panning and zooming',
	undoRedoTool: 'Undo/Redo',
	rightClickDragPanTool: 'Right-click drag',
	pipetteTool: 'Pick color from screen',
	keyboardPanZoom: 'Keyboard pan/zoom shortcuts',

	textTool: 'Text',
	enterTextToInsert: 'Text to insert',

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
