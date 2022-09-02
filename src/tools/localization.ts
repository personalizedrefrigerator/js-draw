
export interface ToolLocalization {
	RightClickDragPanTool: string;
    penTool: (penId: number)=>string;
    selectionTool: string;
    eraserTool: string;
    touchPanTool: string;
    twoFingerPanZoomTool: string;
    undoRedoTool: string;

    toolEnabledAnnouncement: (toolName: string) => string;
    toolDisabledAnnouncement: (toolName: string) => string;
}

export const defaultToolLocalization: ToolLocalization = {
	penTool: (penId) => `Pen ${penId}`,
	selectionTool: 'Selection',
	eraserTool: 'Eraser',
	touchPanTool: 'Touch Panning',
	twoFingerPanZoomTool: 'Panning and Zooming',
	undoRedoTool: 'Undo/Redo',
	RightClickDragPanTool: 'Right-click drag',

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
