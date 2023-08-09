import { Color4 } from '@js-draw/math';
import { isRestylableComponent } from '../../components/RestylableComponent';
import Editor from '../../Editor';
import uniteCommands from '../../commands/uniteCommands';
import SelectionTool from '../../tools/SelectionTool/SelectionTool';
import { EditorEventType } from '../../types';
import { KeyPressEvent } from '../../inputEvents';
import { ToolbarLocalization } from '../localization';
import makeColorInput from './components/makeColorInput';
import ActionButtonWidget from './ActionButtonWidget';
import BaseToolWidget from './BaseToolWidget';
import { resizeImageToSelectionKeyboardShortcut } from './keybindings';
import makeSeparator from './components/makeSeparator';

const makeFormatMenu = (editor: Editor, selectionTool: SelectionTool, localizationTable: ToolbarLocalization) => {
	const container = document.createElement('div');
	container.classList.add('selection-format-menu');

	const colorRow = document.createElement('div');
	const colorLabel = document.createElement('label');
	const [ colorInput, colorInputContainer, setColorInputValue ] = makeColorInput(editor, color => {
		const selection = selectionTool.getSelection();

		if (selection) {
			const updateStyleCommands = [];

			for (const elem of selection.getSelectedObjects()) {
				if (isRestylableComponent(elem)) {
					updateStyleCommands.push(elem.updateStyle({ color }));
				}
			}

			const unitedCommand = uniteCommands(updateStyleCommands);
			editor.dispatch(unitedCommand);
		}
	});

	colorLabel.innerText = localizationTable.colorLabel;

	const update = () => {
		const selection = selectionTool.getSelection();
		if (selection && selection.getSelectedItemCount() > 0) {
			colorInput.disabled = false;
			container.classList.remove('disabled');

			const colors = [];
			for (const elem of selection.getSelectedObjects()) {
				if (isRestylableComponent(elem)) {
					const color = elem.getStyle().color;
					if (color) {
						colors.push(color);
					}
				}
			}
			setColorInputValue(Color4.average(colors));
		} else {
			colorInput.disabled = true;
			container.classList.add('disabled');
			setColorInputValue(Color4.transparent);
		}
	};

	colorRow.replaceChildren(colorLabel, colorInputContainer);
	container.replaceChildren(colorRow);

	return {
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
		update,
	};
};

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

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		super.fillDropdown(dropdown);

		makeSeparator(this.localizationTable.reformatSelection).addTo(dropdown);

		const formatMenu = makeFormatMenu(this.editor, this.tool, this.localizationTable);
		formatMenu.addTo(dropdown);
		this.updateFormatMenu = () => formatMenu.update();

		formatMenu.update();

		return true;
	}
}