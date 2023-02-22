import Color4 from '../../Color4';
import Editor from '../../Editor';
import { EditorImageEventType } from '../../EditorImage';
import Rect2 from '../../math/Rect2';
import { EditorEventType } from '../../types';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseWidget from './BaseWidget';

export default class DocumentPropertiesWidget extends BaseWidget {
	private updateDropdownContent: ()=>void = () => {};

	public constructor(editor: Editor, localizationTable?: ToolbarLocalization) {
		super(editor, 'zoom-widget', localizationTable);

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

	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		const backgroundColorRow = document.createElement('div');
		const backgroundColorLabel = document.createElement('label');

		backgroundColorLabel.innerText = this.localizationTable.backgroundColor;

		const [ colorInput, backgroundColorInputContainer, setBgColorInputValue ] = makeColorInput(this.editor, color => {
			if (!color.eq(this.getBackgroundColor())) {
				this.setBackgroundColor(color);
			}
		});

		colorInput.id = `document-properties-color-input-${DocumentPropertiesWidget.idCounter++}`;
		backgroundColorLabel.htmlFor = colorInput.id;

		backgroundColorRow.replaceChildren(backgroundColorLabel, backgroundColorInputContainer);

		const addDimensionRow = (labelContent: string, onChange: (value: number)=>void) => {
			const row = document.createElement('div');
			const label = document.createElement('label');
			const spacer = document.createElement('span');
			const input = document.createElement('input');

			label.innerText = labelContent;
			input.type = 'number';
			input.min = '0';
			input.id = `document-properties-dimension-row-${DocumentPropertiesWidget.idCounter++}`;
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
		};
		this.updateDropdownContent();


		container.replaceChildren(
			backgroundColorRow, imageWidthRow.element, imageHeightRow.element
		);
		dropdown.replaceChildren(container);

		return true;
	}
}
