import Editor from '../../Editor';
import TextTool from '../../tools/TextTool';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { makeTextIcon } from '../icons';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseToolWidget from './BaseToolWidget';

export default class TextToolWidget extends BaseToolWidget {
	private updateDropdownInputs: (()=>void)|null = null;
	public constructor(editor: Editor, private tool: TextTool, localization: ToolbarLocalization) {
		super(editor, tool, localization);

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
		return makeTextIcon(textStyle);
	}

	private static idCounter: number = 0;
	protected fillDropdown(dropdown: HTMLElement): boolean {
		const fontRow = document.createElement('div');
		const colorRow = document.createElement('div');

		const fontInput = document.createElement('select');
		const fontLabel = document.createElement('label');

		const [ colorInput, colorInputContainer ] = makeColorInput(this.editor, color => {
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

		fontLabel.innerText = this.localizationTable.fontLabel;
		colorLabel.innerText = this.localizationTable.colorLabel;

		colorInput.id = `${toolbarCSSPrefix}-text-color-input-${TextToolWidget.idCounter++}`;
		colorLabel.setAttribute('for', colorInput.id);

		addFontToInput('monospace');
		addFontToInput('serif');
		addFontToInput('sans-serif');
		fontInput.id = `${toolbarCSSPrefix}-text-font-input-${TextToolWidget.idCounter++}`;
		fontLabel.setAttribute('for', fontInput.id);

		fontInput.onchange = () => {
			this.tool.setFontFamily(fontInput.value);
		};

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInputContainer);

		fontRow.appendChild(fontLabel);
		fontRow.appendChild(fontInput);

		this.updateDropdownInputs = () => {
			const style = this.tool.getTextStyle();
			colorInput.value = style.renderingStyle.fill.toHexString();

			if (!fontsInInput.has(style.fontFamily)) {
				addFontToInput(style.fontFamily);
			}
			fontInput.value = style.fontFamily;
		};
		this.updateDropdownInputs();

		dropdown.replaceChildren(colorRow, fontRow);
		return true;
	}
}