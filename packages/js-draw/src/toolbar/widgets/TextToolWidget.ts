import Color4 from '../../Color4';
import Editor from '../../Editor';
import TextTool from '../../tools/TextTool';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../DropdownToolbar';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseToolWidget from './BaseToolWidget';
import { SavedToolbuttonState } from './BaseWidget';

export default class TextToolWidget extends BaseToolWidget {
	private updateDropdownInputs: (()=>void)|null = null;
	public constructor(editor: Editor, private tool: TextTool, localization?: ToolbarLocalization) {
		super(editor, tool, 'text-tool-widget', localization);

		editor.notifier.on(EditorEventType.ToolUpdated, evt => {
			if (evt.kind === EditorEventType.ToolUpdated && evt.tool === tool) {
				this.updateIcon();
				this.updateDropdownInputs?.();
			}
		});
	}

	protected getTitle(): string {
		return this.targetTool.description;
	}

	protected createIcon(): Element {
		const textStyle = this.tool.getTextStyle();
		return this.editor.icons.makeTextIcon(textStyle);
	}

	private static idCounter: number = 0;
	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add(`${toolbarCSSPrefix}spacedList`);
		const fontRow = document.createElement('div');
		const colorRow = document.createElement('div');
		const sizeRow = document.createElement('div');

		const fontInput = document.createElement('select');
		const fontLabel = document.createElement('label');

		const sizeInput = document.createElement('input');
		const sizeLabel = document.createElement('label');

		const [ colorInput, colorInputContainer, setColorInputValue ] = makeColorInput(this.editor, color => {
			this.tool.setColor(color);
		});
		const colorLabel = document.createElement('label');

		const fontsInInput = new Set();
		const addFontToInput = (fontName: string) => {
			const option = document.createElement('option');
			option.value = fontName;
			option.textContent = fontName;
			fontInput.appendChild(option);
			fontsInInput.add(fontName);
		};

		sizeInput.setAttribute('type', 'number');
		sizeInput.min = '1';
		sizeInput.max = '128';

		fontLabel.innerText = this.localizationTable.fontLabel;
		colorLabel.innerText = this.localizationTable.colorLabel;
		sizeLabel.innerText = this.localizationTable.textSize;

		colorInput.id = `${toolbarCSSPrefix}-text-color-input-${TextToolWidget.idCounter++}`;
		colorLabel.setAttribute('for', colorInput.id);

		sizeInput.id = `${toolbarCSSPrefix}-text-size-input-${TextToolWidget.idCounter++}`;
		sizeLabel.setAttribute('for', sizeInput.id);

		addFontToInput('monospace');
		addFontToInput('serif');
		addFontToInput('sans-serif');
		fontInput.id = `${toolbarCSSPrefix}-text-font-input-${TextToolWidget.idCounter++}`;
		fontLabel.setAttribute('for', fontInput.id);

		fontInput.onchange = () => {
			this.tool.setFontFamily(fontInput.value);
		};

		sizeInput.onchange = () => {
			const size = parseInt(sizeInput.value);
			if (!isNaN(size) && size > 0) {
				this.tool.setFontSize(size);
			}
		};

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInputContainer);

		fontRow.appendChild(fontLabel);
		fontRow.appendChild(fontInput);

		sizeRow.appendChild(sizeLabel);
		sizeRow.appendChild(sizeInput);

		this.updateDropdownInputs = () => {
			const style = this.tool.getTextStyle();
			setColorInputValue(style.renderingStyle.fill);

			if (!fontsInInput.has(style.fontFamily)) {
				addFontToInput(style.fontFamily);
			}
			fontInput.value = style.fontFamily;
			sizeInput.value = `${style.size}`;
		};
		this.updateDropdownInputs();

		container.replaceChildren(colorRow, sizeRow, fontRow);
		dropdown.appendChild(container);
		return true;
	}

	public override serializeState(): SavedToolbuttonState {
		const textStyle = this.tool.getTextStyle();

		return {
			...super.serializeState(),

			fontFamily: textStyle.fontFamily,
			textSize: textStyle.size,
			color: textStyle.renderingStyle.fill.toHexString(),
		};
	}

	public override deserializeFrom(state: SavedToolbuttonState) {
		if (state.fontFamily && typeof(state.fontFamily) === 'string') {
			this.tool.setFontFamily(state.fontFamily);
		}

		if (state.color && typeof(state.color) === 'string') {
			this.tool.setColor(Color4.fromHex(state.color));
		}

		if (state.textSize && typeof(state.textSize) === 'number') {
			this.tool.setFontSize(state.textSize);
		}

		super.deserializeFrom(state);
	}
}