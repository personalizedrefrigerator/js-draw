
export interface ToolLocalization {
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

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
