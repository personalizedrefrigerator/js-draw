
export interface ToolLocalization {
	keyboardPanZoom: string;
	penTool: (penId: number)=>string;
	selectionTool: string;
	selectAllTool: string;
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

	soundExplorer: string;
	disableAccessibilityExploreTool: string;
	enableAccessibilityExploreTool: string;
	soundExplorerUsageAnnouncement: string;

	findLabel: string;
	toNextMatch: string;
	closeDialog: string;
	findDialogShown: string;
	findDialogHidden: string;
	focusedFoundText: (currentMatchNumber: number, totalMatches: number)=> string;

	anyDevicePanning: string;

	copied: (count: number, description: string) => string;
	pasted: (count: number, description: string) => string;

	toolEnabledAnnouncement: (toolName: string) => string;
	toolDisabledAnnouncement: (toolName: string) => string;
}

export const defaultToolLocalization: ToolLocalization = {
	penTool: (penId) => `Pen ${penId}`,
	selectionTool: 'Selection',
	selectAllTool: 'Select all shortcut',
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

	soundExplorer: 'Sound-based image exploration',
	disableAccessibilityExploreTool: 'Disable sound-based exploration',
	enableAccessibilityExploreTool: 'Enable sound-based exploration',
	soundExplorerUsageAnnouncement: 'Sound-based image exploration enabled: Click/drag the screen to play a sound representation of different parts of the image.',

	findLabel: 'Find',
	toNextMatch: 'Next',
	closeDialog: 'Close',
	findDialogShown: 'Find dialog shown',
	findDialogHidden: 'Find dialog hidden',
	focusedFoundText: (matchIdx: number, totalMatches: number) => `Viewing match ${matchIdx} of ${totalMatches}`,

	anyDevicePanning: 'Any device panning',

	copied: (count: number, description: string) => `Copied ${count} ${description}`,
	pasted: (count: number, description: string) => `Pasted ${count} ${description}`,

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
