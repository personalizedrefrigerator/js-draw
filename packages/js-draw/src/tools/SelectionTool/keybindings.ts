import KeyboardShortcutManager from '../../shortcuts/KeyboardShortcutManager';

// Selection
export const selectAllKeyboardShortcut = 'jsdraw.tools.SelectionTool.selectAll';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	selectAllKeyboardShortcut, [ 'CtrlOrMeta+KeyA' ], 'Select all'
);
export const duplicateSelectionShortcut = 'jsdraw.tools.SelectionTool.duplicateSelection';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	duplicateSelectionShortcut, [ 'CtrlOrMeta+KeyD' ], 'Duplicate selection'
);
export const sendToBackSelectionShortcut = 'jsdraw.tools.SelectionTool.sendToBack';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	sendToBackSelectionShortcut, [ 'End' ], 'Send to back'
);

export const translateLeftSelectionShortcutId = 'jsdraw.tools.SelectionTool.translateLeft';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	translateLeftSelectionShortcutId, [ 'KeyA', 'KeyH', 'ArrowLeft' ], 'Move selection left',
);
export const translateRightSelectionShortcutId = 'jsdraw.tools.SelectionTool.translateRight';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	translateRightSelectionShortcutId, [ 'KeyD', 'KeyL', 'ArrowRight' ], 'Move selection right',
);

export const translateUpSelectionShortcutId = 'jsdraw.tools.SelectionTool.translateUp';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	translateUpSelectionShortcutId, [ 'KeyQ', 'KeyK', 'ArrowUp' ], 'Move selection up',
);
export const translateDownSelectionShortcutId = 'jsdraw.tools.SelectionTool.translateDown';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	translateDownSelectionShortcutId, [ 'KeyE', 'KeyJ', 'ArrowDown' ], 'Move selection down',
);

export const rotateCounterClockwiseSelectionShortcutId = 'jsdraw.tools.SelectionTool.rotateCCW';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateCounterClockwiseSelectionShortcutId, [ 'Shift+KeyR' ], 'Rotate selection counter clockwise',
);
export const rotateClockwiseSelectionShortcutId = 'jsdraw.tools.SelectionTool.rotateCW';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateClockwiseSelectionShortcutId, [ 'KeyR' ], 'Rotate selection clockwise',
);

export const shrinkXSelectionShortcutId = 'jsdraw.tools.SelectionTool.shrink.x';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	shrinkXSelectionShortcutId, [ 'KeyI' ], 'Decrease width',
);
export const stretchXSelectionShortcutId = 'jsdraw.tools.SelectionTool.stretch.x';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	stretchXSelectionShortcutId, [ 'Shift+KeyI' ], 'Increase width',
);

export const shrinkYSelectionShortcutId = 'jsdraw.tools.SelectionTool.shrink.y';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	shrinkYSelectionShortcutId, [ 'KeyO' ], 'Decrease height',
);
export const stretchYSelectionShortcutId = 'jsdraw.tools.SelectionTool.stretch.y';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	stretchYSelectionShortcutId, [ 'Shift+KeyO' ], 'Increase height',
);

export const shrinkXYSelectionShortcutId = 'jsdraw.tools.SelectionTool.shrink.xy';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	shrinkXYSelectionShortcutId, [ 'Comma' ], 'Decrease selection size',
);
export const stretchXYSelectionShortcutId = 'jsdraw.tools.SelectionTool.stretch.xy';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	stretchXYSelectionShortcutId, [ 'Period' ], 'Increase selection size',
);
