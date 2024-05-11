import Editor from '../../../Editor';
import SelectionTool from '../../../tools/SelectionTool/SelectionTool';
import { EditorEventType } from '../../../types';
import { KeyPressEvent } from '../../../inputEvents';
import { ToolbarLocalization } from '../../localization';
import ActionButtonWidget from '../ActionButtonWidget';
import BaseToolWidget from '../BaseToolWidget';
import { resizeImageToSelectionKeyboardShortcut } from '../keybindings';
import makeSeparator from '../components/makeSeparator';
import { toolbarCSSPrefix } from '../../constants';
import HelpDisplay from '../../utils/HelpDisplay';
import ClipboardHandler from '../../../util/ClipboardHandler';
import BaseWidget from '../BaseWidget';
import makeFormatMenu from './makeFormatMenu';
import CopyPasteWidget from './CopyPasteWidget';

export default class SelectionToolWidget extends BaseToolWidget {
	private updateFormatMenu: ()=>void = () => {};

	public constructor(
		editor: Editor, private tool: SelectionTool, localization?: ToolbarLocalization
	) {
		super(editor, tool, 'selection-tool-widget', localization);

		const resizeButton = new ActionButtonWidget(
			editor, 'resize-btn',
			() => editor.icons.makeResizeImageToSelectionIcon(),
			this.localizationTable.resizeImageToSelection,
			() => {
				this.resizeImageToSelection();
			},
			localization,
		);
		resizeButton.setHelpText(this.localizationTable.selectionDropdown__resizeToHelpText);

		const deleteButton = new ActionButtonWidget(
			editor, 'delete-btn',
			() => editor.icons.makeDeleteSelectionIcon(),
			this.localizationTable.deleteSelection,
			() => {
				const selection = this.tool.getSelection();
				this.editor.dispatch(selection!.deleteSelectedObjects());
				this.tool.clearSelection();
			},
			localization,
		);
		deleteButton.setHelpText(this.localizationTable.selectionDropdown__deleteHelpText);

		const duplicateButton = new ActionButtonWidget(
			editor, 'duplicate-btn',
			() => editor.icons.makeDuplicateSelectionIcon(),
			this.localizationTable.duplicateSelection,
			async () => {
				const selection = this.tool.getSelection();
				this.editor.dispatch(await selection!.duplicateSelectedObjects());
				this.setDropdownVisible(false);
			},
			localization,
		);
		duplicateButton.setHelpText(this.localizationTable.selectionDropdown__duplicateHelpText);

		let copyPasteWidget: BaseWidget|null = null;

		const clipboardHandler = new ClipboardHandler(this.editor);
		if (clipboardHandler.canCopyPasteWithoutEvent()) {
			copyPasteWidget = new CopyPasteWidget(
				editor,
				'copy-paste-widget',
				this.tool,
				clipboardHandler,
				this.localizationTable,
			);
		}

		this.addSubWidget(resizeButton);
		this.addSubWidget(deleteButton);
		this.addSubWidget(duplicateButton);

		if (copyPasteWidget) {
			this.addSubWidget(copyPasteWidget);
		}

		const updateDisabled = (missingSelection: boolean) => {
			resizeButton.setDisabled(missingSelection);
			deleteButton.setDisabled(missingSelection);
			duplicateButton.setDisabled(missingSelection);
		};
		updateDisabled(true);

		// Enable/disable actions based on whether items are selected
		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = selection && selection.getSelectedItemCount() > 0;

				updateDisabled(!hasSelection);
				this.updateFormatMenu();
			}
		});
	}

	private resizeImageToSelection() {
		const selection = this.tool.getSelection();
		if (selection) {
			this.editor.dispatch(this.editor.setImportExportRect(selection.region));
		}
	}

	protected override onKeyPress(event: KeyPressEvent): boolean {
		const shortcuts = this.editor.shortcuts;

		// Resize image to selection:
		// Other keys are handled directly by the selection tool.
		if (shortcuts.matchesShortcut(resizeImageToSelectionKeyboardShortcut, event)) {
			this.resizeImageToSelection();
			return true;
		}

		// If we didn't handle the event, allow the superclass to handle it.
		if (super.onKeyPress(event)) {
			return true;
		}
		return false;
	}

	protected getTitle(): string {
		return this.localizationTable.select;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeSelectionIcon();
	}

	protected override getHelpText(): string {
		return this.localizationTable.selectionDropdown__baseHelpText;
	}

	protected override fillDropdown(dropdown: HTMLElement, helpDisplay?: HelpDisplay): boolean {
		super.fillDropdown(dropdown, helpDisplay);

		const controlsContainer = document.createElement('div');
		controlsContainer.classList.add(`${toolbarCSSPrefix}nonbutton-controls-main-list`);
		dropdown.appendChild(controlsContainer);

		makeSeparator(this.localizationTable.reformatSelection).addTo(controlsContainer);

		const formatMenu = makeFormatMenu(this.editor, this.tool, this.localizationTable);
		formatMenu.addTo(controlsContainer);
		this.updateFormatMenu = () => formatMenu.update();

		if (helpDisplay) {
			formatMenu.registerHelpText(helpDisplay);
		}

		formatMenu.update();

		return true;
	}
}
