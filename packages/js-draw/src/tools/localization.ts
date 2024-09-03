
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

	autocorrectedTo: (description: string) => string;
	autocorrectionCanceled: string;

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

	selectionMenu__show: string;
	selectionMenu__copyToClipboard: string;
	selectionMenu__duplicate: string;
	selectionMenu__delete: string;
	selectionMenu__paste: string;
	copied: (count: number) => string;
	pasted: (count: number) => string;
	copyPasteError__heading: string;
	copyPasteError__description: string;
	copyPasteError__pasteRetry: string;
	copyPasteError__errorDetails: string;

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

	selectionMenu__show: 'Show selection menu',
	selectionMenu__copyToClipboard: 'Copy to clipboard',
	selectionMenu__duplicate: 'Duplicate',
	selectionMenu__delete: 'Delete',
	selectionMenu__paste: 'Paste',
	copyPasteError__heading: 'Error!',
	copyPasteError__description: 'Something went wrong — this tool may not have clipboard access.',
	copyPasteError__errorDetails: 'Show error',
	copyPasteError__pasteRetry: 'To retry, please paste into the input box below:',

	autocorrectedTo: (strokeDescription) => `Autocorrected to ${strokeDescription}`,
	autocorrectionCanceled: 'Autocorrect cancelled',

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

	copied: (count: number) => `Copied ${count} item(s)`,
	pasted: (count: number) => `Pasted ${count} item(s)`,

	toolEnabledAnnouncement: (toolName) => `${toolName} enabled`,
	toolDisabledAnnouncement: (toolName) => `${toolName} disabled`,
};
