import Editor from '../../Editor';
import { KeyPressEvent } from '../../types';
import BaseTool from '../BaseTool';
import SelectionTool from './SelectionTool';

// Handles ctrl+a: Select all
export default class SelectAllShortcutHandler extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.selectAllTool);
	}
    
	// @internal
	public onKeyPress({ key, ctrlKey }: KeyPressEvent): boolean {
		if (ctrlKey && key === 'a') {
			const selectionTools = this.editor.toolController.getMatchingTools(SelectionTool);
			
			if (selectionTools.length > 0) {
				const selectionTool = selectionTools[0];
				selectionTool.setEnabled(true);
				selectionTool.setSelection(this.editor.image.getAllElements());

				return true;
			}
		}

		return false;
	}
}
