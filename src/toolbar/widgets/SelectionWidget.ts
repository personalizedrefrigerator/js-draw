import Editor from '../../Editor';
import SelectionTool from '../../tools/SelectionTool';
import { EditorEventType } from '../../types';
import { makeSelectionIcon } from '../icons';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';

export class SelectionWidget extends BaseToolWidget {
	public constructor(
		editor: Editor, private tool: SelectionTool, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);
	}

	protected getTitle(): string {
		return this.localizationTable.select;
	}

	protected createIcon(): Element {
		return makeSelectionIcon();
	}

	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		const resizeButton = document.createElement('button');
		const deleteButton = document.createElement('button');

		resizeButton.innerText = this.localizationTable.resizeImageToSelection;
		resizeButton.disabled = true;
		deleteButton.innerText = this.localizationTable.deleteSelection;
		deleteButton.disabled = true;

		resizeButton.onclick = () => {
			const selection = this.tool.getSelection();
			this.editor.dispatch(this.editor.setImportExportRect(selection!.region));
		};

		deleteButton.onclick = () => {
			const selection = this.tool.getSelection();
			this.editor.dispatch(selection!.deleteSelectedObjects());
			this.tool.clearSelection();
		};

		// Enable/disable actions based on whether items are selected
		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = selection && selection.region.area > 0;

				resizeButton.disabled = !hasSelection;
				deleteButton.disabled = resizeButton.disabled;
			}
		});

		container.replaceChildren(resizeButton, deleteButton);
		dropdown.appendChild(container);
		return true;
	}
}