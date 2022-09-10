import Editor from '../../Editor';
import SelectionTool from '../../tools/SelectionTool';
import { EditorEventType } from '../../types';
import { makeDeleteSelectionIcon, makeDuplicateSelectionIcon, makeResizeViewportIcon, makeSelectionIcon } from '../icons';
import { ToolbarLocalization } from '../localization';
import ActionButtonWidget from './ActionButtonWidget';
import BaseToolWidget from './BaseToolWidget';

export class SelectionWidget extends BaseToolWidget {
	public constructor(
		editor: Editor, private tool: SelectionTool, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);

		const resizeButton = new ActionButtonWidget(
			editor, localization,
			makeResizeViewportIcon,
			this.localizationTable.resizeImageToSelection,
			() => {
				const selection = this.tool.getSelection();
				this.editor.dispatch(this.editor.setImportExportRect(selection!.region));
			},
		);
		const deleteButton = new ActionButtonWidget(
			editor, localization,
			makeDeleteSelectionIcon,
			this.localizationTable.deleteSelection,
			() => {
				const selection = this.tool.getSelection();
				this.editor.dispatch(selection!.deleteSelectedObjects());
				this.tool.clearSelection();
			},
		);
		const duplicateButton = new ActionButtonWidget(
			editor, localization,
			makeDuplicateSelectionIcon,
			this.localizationTable.duplicateSelection,
			() => {
				const selection = this.tool.getSelection();
				this.editor.dispatch(selection!.duplicateSelectedObjects());
			},
		);

		this.addSubWidget(resizeButton);
		this.addSubWidget(deleteButton);
		this.addSubWidget(duplicateButton);

		const updateDisabled = (disabled: boolean) => {
			resizeButton.setDisabled(disabled);
			deleteButton.setDisabled(disabled);
			duplicateButton.setDisabled(disabled);
		};
		updateDisabled(true);

		// Enable/disable actions based on whether items are selected
		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = selection && selection.region.area > 0;

				updateDisabled(!hasSelection);
			}
		});
	}

	protected getTitle(): string {
		return this.localizationTable.select;
	}

	protected createIcon(): Element {
		return makeSelectionIcon();
	}
}