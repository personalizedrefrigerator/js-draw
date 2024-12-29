import Editor from '../Editor';
import { KeyPressEvent } from '../inputEvents';
import BaseTool from './BaseTool';
import { redoKeyboardShortcutId, undoKeyboardShortcutId } from './keybindings';

// Handles ctrl+Z, ctrl+Shift+Z keyboard shortcuts.
export default class UndoRedoShortcut extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.undoRedoTool);
	}

	// @internal
	public override onKeyPress(event: KeyPressEvent): boolean {
		if (this.editor.shortcuts.matchesShortcut(undoKeyboardShortcutId, event)) {
			void this.editor.history.undo();
			return true;
		} else if (this.editor.shortcuts.matchesShortcut(redoKeyboardShortcutId, event)) {
			void this.editor.history.redo();
			return true;
		}

		return false;
	}
}
