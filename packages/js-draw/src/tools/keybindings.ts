import KeyboardShortcutManager from '../shortcuts/KeyboardShortcutManager';

// This file contains user-overridable tool-realted keybindings.

// Undo/redo
export const undoKeyboardShortcutId = 'jsdraw.tools.undo';
export const redoKeyboardShortcutId = 'jsdaw.tools.redo';

KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	undoKeyboardShortcutId, [ 'CtrlOrMeta+KeyZ' ], 'Undo'
);
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	redoKeyboardShortcutId, [ 'CtrlOrMeta+Shift+KeyZ', 'CtrlOrMeta+KeyY' ], 'Redo'
);

// Pen/eraser/selection keybindings
export const increaseSizeKeyboardShortcutId = 'jsdraw.tools.increaseSize';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	increaseSizeKeyboardShortcutId, [ 'Equal', 'Shift+Equal' ], 'Increase pen/eraser size'
);
export const decreaseSizeKeyboardShortcutId = 'jsdraw.tools.decreaseSize';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	decreaseSizeKeyboardShortcutId, [ 'Minus', 'Shift+Minus' ], 'Decrease pen/eraser size'
);
export const snapToGridKeyboardShortcutId = 'jsdraw.tools.snapToGrid';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	snapToGridKeyboardShortcutId, [ 'Control', 'Meta' ], 'Snap to grid (press and hold)'
);
export const lineLockKeyboardShortcutId = 'jsdraw.tools.lockToLine';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	lineLockKeyboardShortcutId, [ 'Shift' ], 'Snap to XY axes (press and hold)'
);

// Find tool
export const toggleFindVisibleShortcutId = 'js-draw.tools.FindTool.toggleVisible';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	toggleFindVisibleShortcutId,
	[ 'CtrlOrMeta+KeyF' ],
	'Shows/hides the find tool'
);

// Pan/zoom
export const moveLeftKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveLeft';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveLeftKeyboardShortcutId, [ 'ArrowLeft', 'KeyH', 'KeyA' ], 'Pan left'
);
export const moveRightKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveRight';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveRightKeyboardShortcutId, [ 'ArrowRight', 'KeyL', 'KeyD' ], 'Pan right'
);
export const moveUpKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveUp';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveUpKeyboardShortcutId, [ 'ArrowUp', 'KeyK', 'KeyQ' ], 'Pan up'
);
export const moveDownKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveDown';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveDownKeyboardShortcutId, [ 'ArrowDown', 'KeyJ', 'KeyE' ], 'Pan down'
);
export const rotateClockwiseKeyboardShortcutId = 'jsdraw.tools.PanZoom.rotateViewClockwise';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateClockwiseKeyboardShortcutId, [ 'Shift+KeyR' ], 'Rotate viewport clockwise'
);
export const rotateCounterClockwiseKeyboardShortcutId = 'jsdraw.tools.PanZoom.rotateViewCounterClockwise';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateCounterClockwiseKeyboardShortcutId, [ 'KeyR' ], 'Rotate viewport counter-clockwise'
);
export const zoomInKeyboardShortcutId = 'jsdraw.tools.PanZoom.zoomIn';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	zoomInKeyboardShortcutId, [ 'KeyW' ], 'Zoom in'
);
export const zoomOutKeyboardShortcutId = 'jsdraw.tools.PanZoom.zoomOut';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	zoomOutKeyboardShortcutId, [ 'KeyS' ], 'Zoom out'
);

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

