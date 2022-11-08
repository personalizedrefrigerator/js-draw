import Editor from '../../Editor';
import Eraser from '../../tools/Eraser';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';

export default class EraserToolWidget extends BaseToolWidget {
	public constructor(
		editor: Editor,
		tool: Eraser,
		localizationTable?: ToolbarLocalization
	) {
		super(editor, tool, 'eraser-tool-widget', localizationTable);
	}

	protected getTitle(): string {
		return this.localizationTable.eraser;
	}
	protected createIcon(): Element {
		return this.editor.icons.makeEraserIcon();
	}

	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown associated with the eraser
		return false;
	}
}
