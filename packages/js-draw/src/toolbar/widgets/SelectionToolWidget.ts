import { Color4 } from '@js-draw/math';
import { isRestylableComponent } from '../../components/RestylableComponent';
import Editor from '../../Editor';
import uniteCommands from '../../commands/uniteCommands';
import SelectionTool, { SelectionMode } from '../../tools/SelectionTool/SelectionTool';
import { EditorEventType } from '../../types';
import { KeyPressEvent } from '../../inputEvents';
import { ToolbarLocalization } from '../localization';
import makeColorInput from './components/makeColorInput';
import ActionButtonWidget from './ActionButtonWidget';
import BaseToolWidget from './BaseToolWidget';
import { resizeImageToSelectionKeyboardShortcut } from './keybindings';
import makeSeparator from './components/makeSeparator';
import { toolbarCSSPrefix } from '../constants';
import HelpDisplay from '../utils/HelpDisplay';
import BaseWidget, { SavedToolbuttonState } from './BaseWidget';

const makeFormatMenu = (
	editor: Editor,
	selectionTool: SelectionTool,
	localizationTable: ToolbarLocalization,
) => {
	const container = document.createElement('div');
	container.classList.add(
		'selection-format-menu',
		`${toolbarCSSPrefix}spacedList`,
		`${toolbarCSSPrefix}indentedList`,
	);

	const colorRow = document.createElement('div');
	const colorLabel = document.createElement('label');
	const colorInputControl = makeColorInput(editor, (color) => {
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
	const { input: colorInput, container: colorInputContainer } = colorInputControl;

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
			colorInputControl.setValue(Color4.average(colors));
		} else {
			colorInput.disabled = true;
			container.classList.add('disabled');
			colorInputControl.setValue(Color4.transparent);
		}
	};

	colorRow.replaceChildren(colorLabel, colorInputContainer);
	container.replaceChildren(colorRow);

	return {
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
		update,
		registerHelpText: (helpDisplay: HelpDisplay) => {
			helpDisplay.registerTextHelpForElement(
				colorRow,
				localizationTable.selectionDropdown__changeColorHelpText,
			);
			colorInputControl.registerWithHelpTextDisplay(helpDisplay);
		},
	};
};

class LassoSelectToggle extends BaseWidget {
	public constructor(
		editor: Editor,
		protected tool: SelectionTool,

		localizationTable?: ToolbarLocalization,
	) {
		super(editor, 'selection-mode-toggle', localizationTable);

		editor.notifier.on(EditorEventType.ToolUpdated, (toolEvt) => {
			if (toolEvt.kind === EditorEventType.ToolUpdated && toolEvt.tool === tool) {
				this.setSelected(tool.modeValue.get() === SelectionMode.Lasso);
			}
		});
		this.setSelected(false);
	}

	protected override shouldAutoDisableInReadOnlyEditor(): boolean {
		return false;
	}

	private setModeFlag(enabled: boolean) {
		this.tool.modeValue.set(enabled ? SelectionMode.Lasso : SelectionMode.Rectangle);
	}

	protected handleClick() {
		this.setModeFlag(!this.isSelected());
	}

	protected getTitle(): string {
		return this.localizationTable.selectionTool__lassoSelect;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeSelectionIcon(SelectionMode.Lasso);
	}

	protected override fillDropdown(_dropdown: HTMLElement): boolean {
		return false;
	}

	protected override getHelpText() {
		return this.localizationTable.selectionTool__lassoSelect__help;
	}
}

export default class SelectionToolWidget extends BaseToolWidget {
	private updateFormatMenu: () => void = () => {};

	public constructor(
		editor: Editor,
		private tool: SelectionTool,
		localization?: ToolbarLocalization,
	) {
		super(editor, tool, 'selection-tool-widget', localization);

		const resizeButton = new ActionButtonWidget(
			editor,
			'resize-btn',
			() => editor.icons.makeResizeImageToSelectionIcon(),
			this.localizationTable.resizeImageToSelection,
			() => {
				this.resizeImageToSelection();
			},
			localization,
		);
		resizeButton.setHelpText(this.localizationTable.selectionDropdown__resizeToHelpText);

		const deleteButton = new ActionButtonWidget(
			editor,
			'delete-btn',
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
			editor,
			'duplicate-btn',
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

		this.addSubWidget(new LassoSelectToggle(editor, tool, this.localizationTable));
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
		this.editor.notifier.on(EditorEventType.ToolUpdated, (toolEvt) => {
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
		tool.modeValue.onUpdate(() => {
			this.updateIcon();
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
		return this.editor.icons.makeSelectionIcon(this.tool.modeValue.get());
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

	public override serializeState(): SavedToolbuttonState {
		return {
			...super.serializeState(),
			selectionMode: this.tool.modeValue.get(),
		};
	}

	public override deserializeFrom(state: SavedToolbuttonState): void {
		super.deserializeFrom(state);

		const isValidSelectionMode = Object.values(SelectionMode).includes(state.selectionMode);
		if (isValidSelectionMode) {
			this.tool.modeValue.set(state.selectionMode);
		}
	}
}
