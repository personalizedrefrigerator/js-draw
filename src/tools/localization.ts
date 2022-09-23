
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
	changeTool: string;
	pasteHandler: string;

	copied: (count: number, description: string) => string;
	pasted: (count: number, description: string) => string;

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
	changeTool: 'Change tool',
	pasteHandler: 'Copy paste handler',

	copied: (count: number, description: string) => `Copied ${count} ${description}`,
	pasted: (count: number, description: string) => `Pasted ${count} ${description}`,

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
