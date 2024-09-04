import KeyboardShortcutManager from '../../shortcuts/KeyboardShortcutManager';

// Selection
export const resizeImageToSelectionKeyboardShortcut =
	'jsdraw.toolbar.SelectionTool.resizeImageToSelection';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	resizeImageToSelectionKeyboardShortcut,
	['ctrlOrMeta+r'],
	'Resize image to selection',
);

// Pen tool
export const selectStrokeTypeKeyboardShortcutIds: string[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
	(id) => `jsdraw.toolbar.PenTool.select-pen-${id}`,
);

for (let i = 0; i < selectStrokeTypeKeyboardShortcutIds.length; i++) {
	const id = selectStrokeTypeKeyboardShortcutIds[i];
	KeyboardShortcutManager.registerDefaultKeyboardShortcut(
		id,
		[`CtrlOrMeta+Digit${i + 1}`],
		'Select pen style ' + (i + 1),
	);
}

// Save
export const saveKeyboardShortcut = 'jsdraw.toolbar.SaveActionWidget.save';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	saveKeyboardShortcut,
	['ctrlOrMeta+KeyS'],
	'Save',
);

// Exit
export const exitKeyboardShortcut = 'jsdraw.toolbar.ExitActionWidget.exit';
KeyboardShortcutManager.registerDefaultKeyboardShortcut(exitKeyboardShortcut, ['Alt+KeyQ'], 'Exit');
