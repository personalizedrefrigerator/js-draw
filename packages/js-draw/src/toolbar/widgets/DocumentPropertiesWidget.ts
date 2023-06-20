import Color4 from '../../Color4';
import Erase from '../../commands/Erase';
import SerializableCommand from '../../commands/SerializableCommand';
import uniteCommands from '../../commands/uniteCommands';
import BackgroundComponent, { BackgroundType } from '../../components/BackgroundComponent';
import Editor from '../../Editor';
import { EditorImageEventType } from '../../EditorImage';
import Rect2 from '../../math/shapes/Rect2';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseWidget from './BaseWidget';

export default class DocumentPropertiesWidget extends BaseWidget {
	private updateDropdownContent: ()=>void = () => {};

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
		const addBackgroundCommand = this.editor.image.addElement(newBackground);

		return uniteCommands([ this.removeBackgroundComponents(), addBackgroundCommand ]);
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

	private updateImportExportRectSize(size: { width?: number, height?: number }) {
		const filterDimension = (dim: number|undefined) => {
			if (dim !== undefined && (!isFinite(dim) || dim <= 0)) {
				dim = 100;
			}

			return dim;
		};

		const width = filterDimension(size.width);
		const height = filterDimension(size.height);

		const currentRect = this.editor.getImportExportRect();
		const newRect = new Rect2(
			currentRect.x, currentRect.y,
			width ?? currentRect.w, height ?? currentRect.h
		);

		this.editor.dispatch(this.editor.image.setImportExportRect(newRect));
		this.editor.queueRerender();
	}

	private static idCounter = 0;

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add(`${toolbarCSSPrefix}spacedList`);

		const backgroundColorRow = document.createElement('div');
		const backgroundColorLabel = document.createElement('label');

		backgroundColorLabel.innerText = this.localizationTable.backgroundColor;

		const [ colorInput, backgroundColorInputContainer, setBgColorInputValue ] = makeColorInput(this.editor, color => {
			if (!color.eq(this.getBackgroundColor())) {
				this.setBackgroundColor(color);
			}
		});

		colorInput.id = `${toolbarCSSPrefix}docPropertiesColorInput-${DocumentPropertiesWidget.idCounter++}`;
		backgroundColorLabel.htmlFor = colorInput.id;

		backgroundColorRow.replaceChildren(backgroundColorLabel, backgroundColorInputContainer);

		const useGridRow = document.createElement('div');
		const useGridLabel = document.createElement('label');
		const useGridCheckbox = document.createElement('input');

		useGridCheckbox.id = `${toolbarCSSPrefix}docPropertiesUseGridCheckbox-${DocumentPropertiesWidget.idCounter++}`;
		useGridLabel.htmlFor = useGridCheckbox.id;

		useGridCheckbox.type = 'checkbox';
		useGridLabel.innerText = this.localizationTable.useGridOption;

		useGridCheckbox.oninput = () => {
			const prevBackgroundType = this.getBackgroundType();
			const wasGrid = prevBackgroundType === BackgroundType.Grid;

			if (wasGrid === useGridCheckbox.checked) {
				// Already the requested background type.
				return;
			}

			let newBackgroundType = BackgroundType.SolidColor;
			if (useGridCheckbox.checked) {
				newBackgroundType = BackgroundType.Grid;
			}

			this.editor.dispatch(this.setBackgroundType(newBackgroundType));
		};

		useGridRow.replaceChildren(useGridLabel, useGridCheckbox);

		const addDimensionRow = (labelContent: string, onChange: (value: number)=>void) => {
			const row = document.createElement('div');
			const label = document.createElement('label');
			const spacer = document.createElement('span');
			const input = document.createElement('input');

			label.innerText = labelContent;
			input.type = 'number';
			input.min = '0';
			input.id = `${toolbarCSSPrefix}docPropertiesDimensionRow-${DocumentPropertiesWidget.idCounter++}`;
			label.htmlFor = input.id;

			spacer.style.flexGrow = '1';
			input.style.flexGrow = '2';
			input.style.width = '25px';

			row.style.display = 'flex';

			input.oninput = () => {
				onChange(parseFloat(input.value));
			};

			row.replaceChildren(label, spacer, input);

			return {
				setValue: (value: number) => {
					input.value = value.toString();
				},
				element: row,
			};
		};

		const imageWidthRow = addDimensionRow(this.localizationTable.imageWidthOption, (value: number) => {
			this.updateImportExportRectSize({ width: value });
		});
		const imageHeightRow = addDimensionRow(this.localizationTable.imageHeightOption, (value: number) => {
			this.updateImportExportRectSize({ height: value });
		});

		this.updateDropdownContent = () => {
			setBgColorInputValue(this.getBackgroundColor());

			const importExportRect = this.editor.getImportExportRect();
			imageWidthRow.setValue(importExportRect.width);
			imageHeightRow.setValue(importExportRect.height);

			useGridCheckbox.checked = this.getBackgroundType() === BackgroundType.Grid;
		};
		this.updateDropdownContent();


		container.replaceChildren(
			backgroundColorRow, useGridRow, imageWidthRow.element, imageHeightRow.element
		);
		dropdown.replaceChildren(container);

		return true;
	}
}
