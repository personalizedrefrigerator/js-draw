

import KeyboardShortcutManager from '../../shortcuts/KeyboardShortcutManager';

// Selection
export const resizeImageToSelectionKeyboardShortcut =
		'jsdraw.toolbar.SelectionTool.resizeImageToSelection';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	resizeImageToSelectionKeyboardShortcut, [ 'ctrlOrMeta+r' ], 'Resize image to selection'
);

// Pen tool
export const selectStrokeTypeKeyboardShortcutIds: string[] =
		[1, 2, 3, 4, 5, 6, 7].map(id => `jsdraw.toolbar.PenTool.select-pen-${id}`);

for (let i = 0; i < selectStrokeTypeKeyboardShortcutIds.length; i++) {
	const id = selectStrokeTypeKeyboardShortcutIds[i];
	KeyboardShortcutManager.registerDefaultKeyboardShortcut(
		id, [ `CtrlOrMeta+Digit${(i + 1)}` ], 'Select pen style ' + (i + 1),
	);
}
