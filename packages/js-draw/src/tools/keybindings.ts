import KeyboardShortcutManager from '../shortcuts/KeyboardShortcutManager';

// This file contains user-overridable tool-realted keybindings.

// Undo/redo
export const undoKeyboardShortcutId = 'jsdraw.tools.undo';
export const redoKeyboardShortcutId = 'jsdaw.tools.redo';

KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	undoKeyboardShortcutId, [ 'ctrlOrMeta+z' ], 'Undo'
);
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	redoKeyboardShortcutId, [ 'ctrlOrMeta+Z', 'ctrlOrMeta+Shift+z' ], 'Redo'
);

// Pen/eraser/selection keybindings
export const increaseSizeKeyboardShortcutId = 'jsdraw.tools.increaseSize';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	increaseSizeKeyboardShortcutId, [ '+', '=' ], 'Increase pen/eraser size'
);
export const decreaseSizeKeyboardShortcutId = 'jsdraw.tools.decreaseSize';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	decreaseSizeKeyboardShortcutId, [ '-', '_' ], 'Decrease pen/eraser size'
);
export const snapToGridKeyboardShortcutId = 'jsdraw.tools.snapToGrid';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	snapToGridKeyboardShortcutId, [ 'control', 'meta' ], 'Snap to grid (press and hold)'
);
export const lineLockKeyboardShortcutId = 'jsdraw.tools.lockToLine';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	lineLockKeyboardShortcutId, [ 'shift' ], 'Snap to XY axes (press and hold)'
);

// Find tool
export const toggleFindVisibleShortcutId = 'js-draw.tools.FindTool.toggleVisible';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	toggleFindVisibleShortcutId,
	[ 'ctrlOrMeta+f' ],
	'Shows/hides the find tool'
);

// Pan/zoom
export const moveLeftKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveLeft';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveLeftKeyboardShortcutId, [ 'ArrowLeft', 'h', 'a' ], 'Pan left'
);
export const moveRightKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveRight';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveRightKeyboardShortcutId, [ 'ArrowRight', 'l', 'd' ], 'Pan right'
);
export const moveUpKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveUp';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveUpKeyboardShortcutId, [ 'ArrowUp', 'k', 'q' ], 'Pan up'
);
export const moveDownKeyboardShortcutId = 'jsdraw.tools.PanZoom.moveDown';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	moveDownKeyboardShortcutId, [ 'ArrowDown', 'j', 'e' ], 'Pan down'
);
export const rotateClockwiseKeyboardShortcutId = 'jsdraw.tools.PanZoom.rotateViewClockwise';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateClockwiseKeyboardShortcutId, [ 'R' ], 'Rotate viewport clockwise'
);
export const rotateCounterClockwiseKeyboardShortcutId = 'jsdraw.tools.PanZoom.rotateViewCounterClockwise';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	rotateCounterClockwiseKeyboardShortcutId, [ 'r' ], 'Rotate viewport counter-clockwise'
);
export const zoomInKeyboardShortcutId = 'jsdraw.tools.PanZoom.zoomIn';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	zoomInKeyboardShortcutId, [ 'w' ], 'Zoom in'
);
export const zoomOutKeyboardShortcutId = 'jsdraw.tools.PanZoom.zoomOut';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	zoomOutKeyboardShortcutId, [ 's' ], 'Zoom out'
);

// Selection
export const selectAllKeyboardShortcut = 'jsdraw.tools.SelectionTool.selectAll';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	selectAllKeyboardShortcut, [ 'ctrlOrMeta+a' ], 'Select all'
);
export const duplicateSelectionShortcut = 'jsdraw.tools.SelectionTool.duplicateSelection';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	duplicateSelectionShortcut, [ 'ctrlOrMeta+d' ], 'Duplicate selection'
);

