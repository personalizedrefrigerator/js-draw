// @internal @packageDocumentation

import { makeArrowBuilder } from '../../components/builders/ArrowBuilder';
import { makeFreehandLineBuilder } from '../../components/builders/FreehandLineBuilder';
import { makeLineBuilder } from '../../components/builders/LineBuilder';
import { makeFilledRectangleBuilder, makeOutlinedRectangleBuilder } from '../../components/builders/RectangleBuilder';
import { ComponentBuilderFactory } from '../../components/builders/types';
import Editor from '../../Editor';
import Pen from '../../tools/Pen';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { makeIconFromFactory, makePenIcon } from '../icons';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseToolWidget from './BaseToolWidget';


interface PenTypeRecord {
	name: string;
	factory: ComponentBuilderFactory;
}

export default class PenWidget extends BaseToolWidget {
	private updateInputs: ()=> void = () => {};
	protected penTypes: PenTypeRecord[];

	public constructor(
		editor: Editor, private tool: Pen, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);

		// Default pen types
		this.penTypes = [
			{
				name: localization.freehandPen,
				factory: makeFreehandLineBuilder,
			},
			{
				name: localization.arrowPen,
				factory: makeArrowBuilder,
			},
			{
				name: localization.linePen,
				factory: makeLineBuilder,
			},
			{
				name: localization.filledRectanglePen,
				factory: makeFilledRectangleBuilder,
			},
			{
				name: localization.outlinedRectanglePen,
				factory: makeOutlinedRectangleBuilder,
			},
		];

		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			// The button icon may depend on tool properties.
			if (toolEvt.tool === this.tool) {
				this.updateIcon();
				this.updateInputs();
			}
		});
	}

	protected getTitle(): string {
		return this.targetTool.description;
	}

	protected createIcon(): Element {
		const strokeFactory = this.tool.getStrokeFactory();
		if (strokeFactory === makeFreehandLineBuilder) {
			// Use a square-root scale to prevent the pen's tip from overflowing.
			const scale = Math.round(Math.sqrt(this.tool.getThickness()) * 4);
			const color = this.tool.getColor();
			return makePenIcon(scale, color.toHexString());
		} else {
			const strokeFactory = this.tool.getStrokeFactory();
			return makeIconFromFactory(this.tool, strokeFactory);
		}
	}

	private static idCounter: number = 0;
	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		const thicknessRow = document.createElement('div');
		const objectTypeRow = document.createElement('div');

		// Thickness: Value of the input is squared to allow for finer control/larger values.
		const thicknessLabel = document.createElement('label');
		const thicknessInput = document.createElement('input');
		const objectSelectLabel = document.createElement('label');
		const objectTypeSelect = document.createElement('select');

		// Give inputs IDs so we can label them with a <label for=...>Label text</label>
		thicknessInput.id = `${toolbarCSSPrefix}thicknessInput${PenWidget.idCounter++}`;
		objectTypeSelect.id = `${toolbarCSSPrefix}builderSelect${PenWidget.idCounter++}`;

		thicknessLabel.innerText = this.localizationTable.thicknessLabel;
		thicknessLabel.setAttribute('for', thicknessInput.id);
		objectSelectLabel.innerText = this.localizationTable.selectObjectType;
		objectSelectLabel.setAttribute('for', objectTypeSelect.id);

		thicknessInput.type = 'range';
		thicknessInput.min = '2';
		thicknessInput.max = '20';
		thicknessInput.step = '1';
		thicknessInput.oninput = () => {
			this.tool.setThickness(parseFloat(thicknessInput.value) ** 2);
		};
		thicknessRow.appendChild(thicknessLabel);
		thicknessRow.appendChild(thicknessInput);

		objectTypeSelect.oninput = () => {
			const penTypeIdx = parseInt(objectTypeSelect.value);
			if (penTypeIdx < 0 || penTypeIdx >= this.penTypes.length) {
				console.error('Invalid pen type index', penTypeIdx);
				return;
			}

			this.tool.setStrokeFactory(this.penTypes[penTypeIdx].factory);
		};
		objectTypeRow.appendChild(objectSelectLabel);
		objectTypeRow.appendChild(objectTypeSelect);

		const colorRow = document.createElement('div');
		const colorLabel = document.createElement('label');
		const [ colorInput, colorInputContainer ] = makeColorInput(this.editor, color => {
			this.tool.setColor(color);
		});

		colorInput.id = `${toolbarCSSPrefix}colorInput${PenWidget.idCounter++}`;
		colorLabel.innerText = this.localizationTable.colorLabel;
		colorLabel.setAttribute('for', colorInput.id);

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInputContainer);

		this.updateInputs = () => {
			colorInput.value = this.tool.getColor().toHexString();
			thicknessInput.value = Math.sqrt(this.tool.getThickness()).toString();

			objectTypeSelect.replaceChildren();
			for (let i = 0; i < this.penTypes.length; i ++) {
				const penType = this.penTypes[i];
				const option = document.createElement('option');
				option.value = i.toString();
				option.innerText = penType.name;

				objectTypeSelect.appendChild(option);

				if (penType.factory === this.tool.getStrokeFactory()) {
					objectTypeSelect.value = i.toString();
				}
			}
		};
		this.updateInputs();

		container.replaceChildren(colorRow, thicknessRow, objectTypeRow);
		dropdown.replaceChildren(container);
		return true;
	}
}
