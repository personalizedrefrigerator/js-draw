import Editor from '../Editor';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';


export default class UndoRedoShortcut extends BaseTool {
	public kind: ToolType.UndoRedoShortcut = ToolType.UndoRedoShortcut;

	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.undoRedoTool);
	}
    
	// Activate undo/redo
	public onKeyPress({ key, ctrlKey }: KeyPressEvent): boolean {
		if (ctrlKey) {
			if (key === 'z') {
				this.editor.history.undo();
				return true;
			} else if (key === 'Z') {
				this.editor.history.redo();
				return true;
			}
		}

		return false;
	}
}