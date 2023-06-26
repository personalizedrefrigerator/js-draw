import Editor from '../Editor';
import KeyboardShortcutManager from '../shortcuts/KeyboardShortcutManager';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';

export const undoKeyboardShortcutId = 'jsdraw.tools.undo';
export const redoKeyboardShortcutId = 'jsdaw.tools.redo';

KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	undoKeyboardShortcutId, [ 'ctrlOrMeta+z' ], 'Undo'
);
KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	redoKeyboardShortcutId, [ 'ctrlOrMeta+shift+z' ], 'Redo'
);

// Handles ctrl+Z, ctrl+Shift+Z keyboard shortcuts.
export default class UndoRedoShortcut extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.undoRedoTool);
	}

	// @internal
	public override onKeyPress(event: KeyPressEvent): boolean {
		if (this.editor.shortcuts.matchesShortcut(undoKeyboardShortcutId, event)) {
			this.editor.history.undo();
			return true;
		} else if (this.editor.shortcuts.matchesShortcut(redoKeyboardShortcutId, event)) {
			this.editor.history.redo();
			return true;
		}

		return false;
	}
}
