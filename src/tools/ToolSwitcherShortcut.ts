// Handles ctrl+1, ctrl+2, ctrl+3, ..., shortcuts for switching tools.
// @packageDocumentation

import Editor from '../Editor';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';

// {@inheritDoc ToolSwitcherShortcut!}
export default class ToolSwitcherShortcut extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.changeTool);
	}
	
	public onKeyPress({ key }: KeyPressEvent): boolean {
		const toolController = this.editor.toolController;
		const primaryTools = toolController.getPrimaryTools();

		// Map keys 0-9 to primary tools.
		const keyMatch = /^[0-9]$/.exec(key);

		let targetTool: BaseTool|undefined;
		if (keyMatch) {
			const targetIdx = parseInt(keyMatch[0], 10) - 1;
			targetTool = primaryTools[targetIdx];
		}

		if (targetTool) {
			targetTool.setEnabled(true);
			return true;
		}

		return false;
	}
}