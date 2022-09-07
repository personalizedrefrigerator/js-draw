import Editor from '../../Editor';
import BaseTool from '../../tools/BaseTool';
import { EditorEventType } from '../../types';
import { ToolbarLocalization } from '../localization';
import BaseWidget from './BaseWidget';

export default abstract class BaseToolWidget extends BaseWidget {
	public constructor(
		protected editor: Editor,
		protected targetTool: BaseTool,
		protected localizationTable: ToolbarLocalization,
	) {
		super(editor, localizationTable);

		editor.notifier.on(EditorEventType.ToolEnabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolEnabled) {
				throw new Error('Incorrect event type! (Expected ToolEnabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.setSelected(true);
			}
		});

		editor.notifier.on(EditorEventType.ToolDisabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolDisabled) {
				throw new Error('Incorrect event type! (Expected ToolDisabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.setSelected(false);
				this.setDropdownVisible(false);
			}
		});
	}

	protected handleClick() {
		if (this.hasDropdown) {
			if (!this.targetTool.isEnabled()) {
				this.targetTool.setEnabled(true);
			} else {
				this.setDropdownVisible(!this.isDropdownVisible());
			}
		} else {
			this.targetTool.setEnabled(!this.targetTool.isEnabled());
		}
	}

	public addTo(parent: HTMLElement) {
		super.addTo(parent);
		this.setSelected(this.targetTool.isEnabled());
	}
}