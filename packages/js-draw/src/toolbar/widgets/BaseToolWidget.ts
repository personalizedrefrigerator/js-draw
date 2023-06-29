import Editor from '../../Editor';
import BaseTool from '../../tools/BaseTool';
import { EditorEventType } from '../../types';
import { ToolbarLocalization } from '../localization';
import BaseWidget from './BaseWidget';

export default abstract class BaseToolWidget extends BaseWidget {
	public constructor(
		editor: Editor,
		protected targetTool: BaseTool,
		id: string,
		localizationTable?: ToolbarLocalization,
	) {
		super(editor, id, localizationTable);

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
				this.activateDropdown();
			} else {
				this.setDropdownVisible(!this.isDropdownVisible());
			}
		} else {
			this.targetTool.setEnabled(!this.targetTool.isEnabled());
		}
	}

	public override addTo(parent: HTMLElement) {
		const result = super.addTo(parent);
		this.setSelected(this.targetTool.isEnabled());

		return result;
	}
}
