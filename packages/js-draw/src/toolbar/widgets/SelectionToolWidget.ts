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
import BaseWidget from './BaseWidget';
import { resizeImageToSelectionKeyboardShortcut } from './keybindings';

class RestyleSelectionWidget extends BaseWidget {
	private updateFormatData: ()=>void = () => {};

	public constructor(editor: Editor, private selectionTool: SelectionTool, localizationTable?: ToolbarLocalization) {
		super(editor, 'restyle-selection', localizationTable);

		// Allow showing the dropdown even if this widget isn't selected yet
		this.container.classList.add('dropdownShowable');

		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.selectionTool) {
				this.updateFormatData();
			}
		});
	}

	protected getTitle(): string {
		return this.localizationTable.reformatSelection;
	}

	protected createIcon(){
		return this.editor.icons.makeFormatSelectionIcon();
	}

	protected handleClick(): void {
		this.setDropdownVisible(!this.isDropdownVisible());
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		const colorRow = document.createElement('div');
		const colorLabel = document.createElement('label');
		const [ colorInput, colorInputContainer, setColorInputValue ] = makeColorInput(this.editor, color => {
			const selection = this.selectionTool.getSelection();

			if (selection) {
				const updateStyleCommands = [];

				for (const elem of selection.getSelectedObjects()) {
					if (isRestylableComponent(elem)) {
						updateStyleCommands.push(elem.updateStyle({ color }));
					}
				}

				const unitedCommand = uniteCommands(updateStyleCommands);
				this.editor.dispatch(unitedCommand);
			}
		});

		colorLabel.innerText = this.localizationTable.colorLabel;

		this.updateFormatData = () => {
			const selection = this.selectionTool.getSelection();
			if (selection) {
				colorInput.disabled = false;

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
			}
		};

		colorRow.replaceChildren(colorLabel, colorInputContainer);
		container.replaceChildren(colorRow);
		dropdown.replaceChildren(container);
		return true;
	}
}

export default class SelectionToolWidget extends BaseToolWidget {
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
		const restyleButton = new RestyleSelectionWidget(
			editor,
			this.tool,
			localization,
		);

		this.addSubWidget(resizeButton);
		this.addSubWidget(deleteButton);
		this.addSubWidget(duplicateButton);
		this.addSubWidget(restyleButton);

		const updateDisabled = (disabled: boolean) => {
			resizeButton.setDisabled(disabled);
			deleteButton.setDisabled(disabled);
			duplicateButton.setDisabled(disabled);
			restyleButton.setDisabled(disabled);
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
}