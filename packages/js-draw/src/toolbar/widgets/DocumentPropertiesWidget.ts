import Erase from '../../commands/Erase';
import SerializableCommand from '../../commands/SerializableCommand';
import uniteCommands from '../../commands/uniteCommands';
import BackgroundComponent, { BackgroundType } from '../../components/BackgroundComponent';
import Editor from '../../Editor';
import { EditorImageEventType } from '../../image/EditorImage';
import { Rect2, Color4 } from '@js-draw/math';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
import makeColorInput from './components/makeColorInput';
import BaseWidget from './BaseWidget';
import HelpDisplay from '../utils/HelpDisplay';

export default class DocumentPropertiesWidget extends BaseWidget {
	private updateDropdownContent: () => void = () => {};

	public constructor(editor: Editor, localizationTable?: ToolbarLocalization) {
		super(editor, 'document-properties-widget', localizationTable);

		// Make it possible to open the dropdown, even if this widget isn't selected.
		this.container.classList.add('dropdownShowable');

		this.editor.notifier.on(EditorEventType.UndoRedoStackUpdated, () => {
			this.queueDropdownUpdate();
		});

		this.editor.image.notifier.on(EditorImageEventType.ExportViewportChanged, () => {
			this.queueDropdownUpdate();
		});
	}

	protected getTitle(): string {
		return this.localizationTable.documentProperties;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeConfigureDocumentIcon();
	}

	protected handleClick() {
		this.setDropdownVisible(!this.isDropdownVisible());
		this.queueDropdownUpdate();
	}

	private dropdownUpdateQueued: boolean = false;
	private queueDropdownUpdate() {
		if (!this.dropdownUpdateQueued) {
			requestAnimationFrame(() => this.updateDropdown());
			this.dropdownUpdateQueued = true;
		}
	}

	private updateDropdown() {
		this.dropdownUpdateQueued = false;

		if (this.isDropdownVisible()) {
			this.updateDropdownContent();
		}
	}

	private setBackgroundColor(color: Color4) {
		this.editor.dispatch(this.editor.setBackgroundColor(color));
	}

	private getBackgroundColor() {
		return this.editor.estimateBackgroundColor();
	}

	private removeBackgroundComponents(): SerializableCommand {
		const previousBackgrounds = [];
		for (const component of this.editor.image.getBackgroundComponents()) {
			if (component instanceof BackgroundComponent) {
				previousBackgrounds.push(component);
			}
		}

		return new Erase(previousBackgrounds);
	}

	/** Replace existing background components with a background of the given type. */
	private setBackgroundType(backgroundType: BackgroundType): SerializableCommand {
		const prevBackgroundColor = this.editor.estimateBackgroundColor();
		const newBackground = new BackgroundComponent(backgroundType, prevBackgroundColor);
		const addBackgroundCommand = this.editor.image.addComponent(newBackground);

		return uniteCommands([this.removeBackgroundComponents(), addBackgroundCommand]);
	}

	/** Returns the type of the topmost background component */
	private getBackgroundType(): BackgroundType {
		const backgroundComponents = this.editor.image.getBackgroundComponents();
		for (let i = backgroundComponents.length - 1; i >= 0; i--) {
			const component = backgroundComponents[i];
			if (component instanceof BackgroundComponent) {
				return component.getBackgroundType();
			}
		}

		return BackgroundType.None;
	}

	private updateImportExportRectSize(size: { width?: number; height?: number }) {
		const filterDimension = (dim: number | undefined) => {
			if (dim !== undefined && (!isFinite(dim) || dim <= 0)) {
				dim = 100;
			}

			return dim;
		};

		const width = filterDimension(size.width);
		const height = filterDimension(size.height);

		const currentRect = this.editor.getImportExportRect();
		const newRect = new Rect2(
			currentRect.x,
			currentRect.y,
			width ?? currentRect.w,
			height ?? currentRect.h,
		);

		this.editor.dispatch(this.editor.image.setImportExportRect(newRect));
		this.editor.queueRerender();
	}

	protected override getHelpText(): string {
		return this.localizationTable.pageDropdown__baseHelpText;
	}

	private static idCounter = 0;

	protected override fillDropdown(dropdown: HTMLElement, helpDisplay?: HelpDisplay): boolean {
		const container = document.createElement('div');
		container.classList.add(
			`${toolbarCSSPrefix}spacedList`,
			`${toolbarCSSPrefix}nonbutton-controls-main-list`,
			`${toolbarCSSPrefix}document-properties-widget`,
		);

		// Background color input
		const makeBackgroundColorInput = () => {
			const backgroundColorRow = document.createElement('div');
			const backgroundColorLabel = document.createElement('label');

			backgroundColorLabel.innerText = this.localizationTable.backgroundColor;

			const {
				input: colorInput,
				container: backgroundColorInputContainer,
				setValue: setBgColorInputValue,
				registerWithHelpTextDisplay: registerHelpForInputs,
			} = makeColorInput(this.editor, (color) => {
				if (!color.eq(this.getBackgroundColor())) {
					this.setBackgroundColor(color);
				}
			});

			colorInput.id = `${toolbarCSSPrefix}docPropertiesColorInput-${DocumentPropertiesWidget.idCounter++}`;
			backgroundColorLabel.htmlFor = colorInput.id;

			backgroundColorRow.replaceChildren(backgroundColorLabel, backgroundColorInputContainer);

			const registerWithHelp = (helpDisplay?: HelpDisplay) => {
				if (!helpDisplay) {
					return;
				}

				helpDisplay?.registerTextHelpForElement(
					backgroundColorRow,
					this.localizationTable.pageDropdown__backgroundColorHelpText,
				);

				registerHelpForInputs(helpDisplay);
			};

			return { setBgColorInputValue, backgroundColorRow, registerWithHelp };
		};
		const {
			backgroundColorRow,
			setBgColorInputValue,
			registerWithHelp: registerBackgroundRowWithHelp,
		} = makeBackgroundColorInput();

		const makeCheckboxRow = (labelText: string, onChange: (newValue: boolean) => void) => {
			const rowContainer = document.createElement('div');
			const labelElement = document.createElement('label');
			const checkboxElement = document.createElement('input');

			checkboxElement.id = `${toolbarCSSPrefix}docPropertiesCheckbox-${DocumentPropertiesWidget.idCounter++}`;
			labelElement.htmlFor = checkboxElement.id;

			checkboxElement.type = 'checkbox';
			labelElement.innerText = labelText;

			checkboxElement.oninput = () => {
				onChange(checkboxElement.checked);
			};

			rowContainer.replaceChildren(labelElement, checkboxElement);

			return { container: rowContainer, checkbox: checkboxElement };
		};

		// Background style selector
		const { container: useGridRow, checkbox: useGridCheckbox } = makeCheckboxRow(
			this.localizationTable.useGridOption,
			(checked) => {
				const prevBackgroundType = this.getBackgroundType();
				const wasGrid = prevBackgroundType === BackgroundType.Grid;

				if (wasGrid === checked) {
					// Already the requested background type.
					return;
				}

				let newBackgroundType = BackgroundType.SolidColor;
				if (checked) {
					newBackgroundType = BackgroundType.Grid;
				}

				this.editor.dispatch(this.setBackgroundType(newBackgroundType));
			},
		);

		// Adds a width/height input
		const addDimensionRow = (labelContent: string, onChange: (value: number) => void) => {
			const row = document.createElement('div');
			const label = document.createElement('label');
			const input = document.createElement('input');

			label.innerText = labelContent;
			input.type = 'number';
			input.min = '0';
			input.id = `${toolbarCSSPrefix}docPropertiesDimensionRow-${DocumentPropertiesWidget.idCounter++}`;
			label.htmlFor = input.id;

			input.style.flexGrow = '2';
			input.style.width = '25px';

			input.oninput = () => {
				onChange(parseFloat(input.value));
			};

			row.classList.add('js-draw-size-input-row');
			row.replaceChildren(label, input);

			return {
				setValue: (value: number) => {
					// Slightly improve the case where the user tries to change the
					// first digit of a dimension like 600.
					//
					// As changing the value also gives the image zero size (which is unsupported,
					// .setValue is called immediately). We work around this by trying to select
					// the added/changed digits.
					//
					// See https://github.com/personalizedrefrigerator/js-draw/issues/58.
					if (document.activeElement === input && input.value.match(/^0*$/)) {
						// We need to switch to type="text" and back to type="number" because
						// number inputs don't support selection.
						//
						// See https://stackoverflow.com/q/22381837
						const originalValue = input.value;

						input.type = 'text';
						input.value = value.toString();

						// Select the added digits
						const lengthToSelect = Math.max(1, input.value.length - originalValue.length);
						input.setSelectionRange(0, lengthToSelect);

						input.type = 'number';
					} else {
						input.value = value.toString();
					}
				},
				setIsAutomaticSize: (automatic: boolean) => {
					input.disabled = automatic;

					const automaticSizeClass = 'size-input-row--automatic-size';
					if (automatic) {
						row.classList.add(automaticSizeClass);
					} else {
						row.classList.remove(automaticSizeClass);
					}
				},
				element: row,
			};
		};

		const imageWidthRow = addDimensionRow(
			this.localizationTable.imageWidthOption,
			(value: number) => {
				this.updateImportExportRectSize({ width: value });
			},
		);
		const imageHeightRow = addDimensionRow(
			this.localizationTable.imageHeightOption,
			(value: number) => {
				this.updateImportExportRectSize({ height: value });
			},
		);

		// The autoresize checkbox
		const { container: auroresizeRow, checkbox: autoresizeCheckbox } = makeCheckboxRow(
			this.localizationTable.enableAutoresizeOption,
			(checked) => {
				const image = this.editor.image;
				this.editor.dispatch(image.setAutoresizeEnabled(checked));
			},
		);

		// The "About..." button
		const aboutButton = document.createElement('button');
		aboutButton.classList.add('about-button');
		aboutButton.innerText = this.localizationTable.about;

		aboutButton.onclick = () => {
			this.editor.showAboutDialog();
		};

		// Add help text
		registerBackgroundRowWithHelp(helpDisplay);
		helpDisplay?.registerTextHelpForElement(
			useGridRow,
			this.localizationTable.pageDropdown__gridCheckboxHelpText,
		);
		helpDisplay?.registerTextHelpForElement(
			auroresizeRow,
			this.localizationTable.pageDropdown__autoresizeCheckboxHelpText,
		);
		helpDisplay?.registerTextHelpForElement(
			aboutButton,
			this.localizationTable.pageDropdown__aboutButtonHelpText,
		);

		this.updateDropdownContent = () => {
			setBgColorInputValue(this.getBackgroundColor());

			const autoresize = this.editor.image.getAutoresizeEnabled();
			const importExportRect = this.editor.getImportExportRect();

			imageWidthRow.setValue(importExportRect.width);
			imageHeightRow.setValue(importExportRect.height);
			autoresizeCheckbox.checked = autoresize;

			imageWidthRow.setIsAutomaticSize(autoresize);
			imageHeightRow.setIsAutomaticSize(autoresize);

			useGridCheckbox.checked = this.getBackgroundType() === BackgroundType.Grid;
		};
		this.updateDropdownContent();

		container.replaceChildren(
			backgroundColorRow,
			useGridRow,
			imageWidthRow.element,
			imageHeightRow.element,
			auroresizeRow,
			aboutButton,
		);
		dropdown.replaceChildren(container);

		return true;
	}
}
