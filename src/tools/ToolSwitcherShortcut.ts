import Editor from '../Editor';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';

/**
 * Handles keyboard events used, by default, to select tools. By default,
 * 1 maps to the first primary tool, 2 to the second primary tool, ... .
 *
 * This is in the default set of {@link ToolController} tools.
 * 
 * @deprecated This may be replaced in the future.
 */
export default class ToolSwitcherShortcut extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.changeTool);
	}

	// @internal
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