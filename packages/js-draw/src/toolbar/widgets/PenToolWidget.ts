import { makeArrowBuilder } from '../../components/builders/ArrowBuilder';
import { makeFreehandLineBuilder } from '../../components/builders/FreehandLineBuilder';
import { makePressureSensitiveFreehandLineBuilder } from '../../components/builders/PressureSensitiveFreehandLineBuilder';
import { makeLineBuilder } from '../../components/builders/LineBuilder';
import { makeFilledRectangleBuilder, makeOutlinedRectangleBuilder } from '../../components/builders/RectangleBuilder';
import { makeOutlinedCircleBuilder } from '../../components/builders/CircleBuilder';
import { ComponentBuilderFactory } from '../../components/builders/types';
import Editor from '../../Editor';
import Pen from '../../tools/Pen';
import { EditorEventType } from '../../types';
import { KeyPressEvent } from '../../inputEvents';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { ToolbarLocalization } from '../localization';
import makeColorInput from '../makeColorInput';
import BaseToolWidget from './BaseToolWidget';
import Color4 from '../../Color4';
import { SavedToolbuttonState } from './BaseWidget';
import { selectStrokeTypeKeyboardShortcutIds } from './keybindings';
import InputStabilizer from '../../tools/InputFilter/InputStabilizer';

export interface PenTypeRecord {
	// Description of the factory (e.g. 'Freehand line')
	name: string;

	// A unique ID for the facotory (e.g. 'chisel-tip-pen')
	id: string;

	// Creates an `AbstractComponent` from pen input.
	factory: ComponentBuilderFactory;
}

export default class PenToolWidget extends BaseToolWidget {
	private updateInputs: ()=> void = () => {};
	protected penTypes: PenTypeRecord[];

	// A counter variable that ensures different HTML elements are given unique names/ids.
	private static idCounter: number = 0;

	public constructor(
		editor: Editor, private tool: Pen, localization?: ToolbarLocalization
	) {
		super(editor, tool, 'pen', localization);

		// Default pen types
		this.penTypes = [
			{
				name: this.localizationTable.flatTipPen,
				id: 'pressure-sensitive-pen',

				factory: makePressureSensitiveFreehandLineBuilder,
			},
			{
				name: this.localizationTable.roundedTipPen,
				id: 'freehand-pen',

				factory: makeFreehandLineBuilder,
			},
			{
				name: this.localizationTable.arrowPen,
				id: 'arrow',

				factory: makeArrowBuilder,
			},
			{
				name: this.localizationTable.linePen,
				id: 'line',

				factory: makeLineBuilder,
			},
			{
				name: this.localizationTable.filledRectanglePen,
				id: 'filled-rectangle',

				factory: makeFilledRectangleBuilder,
			},
			{
				name: this.localizationTable.outlinedRectanglePen,
				id: 'outlined-rectangle',

				factory: makeOutlinedRectangleBuilder,
			},
			{
				name: this.localizationTable.outlinedCirclePen,
				id: 'outlined-circle',

				factory: makeOutlinedCircleBuilder,
			}
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

	// Return the index of this tool's stroke factory in the list of
	// all stroke factories.
	//
	// Returns -1 if the stroke factory is not in the list of all stroke factories.
	private getCurrentPenTypeIdx(): number {
		const currentFactory = this.tool.getStrokeFactory();

		for (let i = 0; i < this.penTypes.length; i ++) {
			if (this.penTypes[i].factory === currentFactory) {
				return i;
			}
		}
		return -1;
	}

	private getCurrentPenType(): PenTypeRecord|null {
		for (const penType of this.penTypes) {
			if (penType.factory === this.tool.getStrokeFactory()) {
				return penType;
			}
		}
		return null;
	}

	private createIconForRecord(record: PenTypeRecord|null) {
		const color = this.tool.getColor();

		const strokeFactory = record?.factory;
		if (!strokeFactory || strokeFactory === makeFreehandLineBuilder || strokeFactory === makePressureSensitiveFreehandLineBuilder) {
			// Use a square-root scale to prevent the pen's tip from overflowing.
			const scale = Math.round(Math.sqrt(this.tool.getThickness()) * 4);
			const roundedTip = strokeFactory === makeFreehandLineBuilder;

			return this.editor.icons.makePenIcon(scale, color.toHexString(), roundedTip);
		} else {
			const hasTransparency = color.a < 1;
			return this.editor.icons.makeIconFromFactory(this.tool, strokeFactory, hasTransparency);
		}
	}

	protected createIcon(): Element {
		return this.createIconForRecord(this.getCurrentPenType());
	}


	// Creates a widget that allows selecting different pen types
	private createPenTypeSelector() {
		const outerContainer = document.createElement('div');
		outerContainer.classList.add(`${toolbarCSSPrefix}pen-type-selector`);

		const scrollingContainer = document.createElement('div');
		scrollingContainer.setAttribute('role', 'menu');
		scrollingContainer.id = `${toolbarCSSPrefix}-pen-type-selector-id-${PenToolWidget.idCounter++}`;

		scrollingContainer.onwheel = (event) => {
			const hasScroll = scrollingContainer.clientWidth !== scrollingContainer.scrollWidth
							&& event.deltaX !== 0;
			const eventScrollsPastLeft =
				scrollingContainer.scrollLeft + event.deltaX <= 0;
			const scrollRight = scrollingContainer.scrollLeft + scrollingContainer.clientWidth;
			const eventScrollsPastRight =
				scrollRight + event.deltaX > scrollingContainer.scrollWidth;

			// Stop the editor from receiving the event if it will scroll the pen type selector
			// instead.
			if (hasScroll && !eventScrollsPastLeft && !eventScrollsPastRight) {
				event.stopPropagation();
			}
		};

		const label = document.createElement('label');
		label.innerText = this.localizationTable.selectPenType;
		label.htmlFor = scrollingContainer.id;
		outerContainer.appendChild(label);

		// All buttons in a radiogroup need the same name attribute.
		const radiogroupName = `${toolbarCSSPrefix}-pen-type-selector-${PenToolWidget.idCounter++}`;

		const createTypeSelectorButton = (record: PenTypeRecord) => {
			const buttonContainer = document.createElement('div');
			buttonContainer.classList.add('pen-type-button');

			const button = document.createElement('input');
			button.type = 'radio';
			button.name = radiogroupName;
			button.id = `${toolbarCSSPrefix}-pen-type-button-${PenToolWidget.idCounter++}`;

			const labelContainer = document.createElement('label');

			const rebuildLabel = () => {
				const labelText = document.createElement('span');

				const icon = this.createIconForRecord(record);
				icon.classList.add('icon');

				// The title of the record
				labelText.innerText = record.name;
				labelContainer.htmlFor = button.id;

				labelContainer.replaceChildren(icon, labelText);
			};
			rebuildLabel();

			const updateButtonCSS = () => {
				if (button.checked) {
					buttonContainer.classList.add('checked');
				} else {
					buttonContainer.classList.remove('checked');
				}
			};

			button.oninput = () => {
				// Setting the stroke factory fires an event that causes the value
				// of this button to be set.
				if (button.checked) {
					this.tool.setStrokeFactory(record.factory);
				}

				updateButtonCSS();
			};

			buttonContainer.replaceChildren(button, labelContainer);
			scrollingContainer.appendChild(buttonContainer);

			// Set whether the button is checked, assuming the stroke factory associated
			// with the button was set elsewhere.
			const setChecked = (checked: boolean) => {
				button.checked = checked;
				updateButtonCSS();

				if (checked) {
					button.scrollIntoView();
				}
			};
			setChecked(false);

			// Updates the factory's icon based on the current style of the tool.
			const updateIcon = () => {
				rebuildLabel();
			};

			return { setChecked, updateIcon };
		};

		const buttons: Array<ReturnType<typeof createTypeSelectorButton>> = [];
		for (const penType of this.penTypes) {
			buttons.push(createTypeSelectorButton(penType));
		}
		// invariant: buttons.length = this.penTypes.length

		outerContainer.appendChild(scrollingContainer);

		return {
			setValue: (penTypeIndex: number) => {
				// Select the value specified
				if (penTypeIndex < 0 || penTypeIndex >= this.penTypes.length) {
					console.error('Invalid pen type index', penTypeIndex);
					return;
				}

				for (let i = 0; i < buttons.length; i++) {
					buttons[i].setChecked(i === penTypeIndex);
				}
			},

			updateIcons: () => {
				buttons.forEach(button => button.updateIcon());
			},

			addTo: (parent: HTMLElement) => {
				parent.appendChild(outerContainer);
			},
		};
	}

	private setInputStabilizationEnabled(enabled: boolean) {
		const hasInputMapper = !!this.tool.getInputMapper();

		if (enabled === hasInputMapper) {
			return;
		}

		if (hasInputMapper) {
			this.tool.setInputMapper(null);
		} else {
			this.tool.setInputMapper(new InputStabilizer(this.editor.viewport));
		}
	}

	protected createAdvancedOptions() {
		const container = document.createElement('details');
		const label = document.createElement('summary');
		label.innerText = this.localizationTable.advanced;

		const stabilizationOption = document.createElement('div');
		const stabilizationCheckbox = document.createElement('input');
		const stabilizationLabel = document.createElement('label');
		stabilizationLabel.innerText = this.localizationTable.inputStabilization;

		stabilizationCheckbox.type = 'checkbox';
		stabilizationCheckbox.id = `${toolbarCSSPrefix}-penInputStabilizationCheckbox-${PenToolWidget.idCounter++}`;
		stabilizationLabel.htmlFor = stabilizationCheckbox.id;

		stabilizationOption.replaceChildren(stabilizationCheckbox, stabilizationLabel);

		container.replaceChildren(label, stabilizationOption);

		stabilizationCheckbox.oninput = () => {
			this.setInputStabilizationEnabled(stabilizationCheckbox.checked);
		};

		return {
			update: () => {
				stabilizationCheckbox.checked = !!this.tool.getInputMapper();
			},

			addTo: (parent: HTMLElement) => {
				parent.appendChild(container);
			}
		};
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add(`${toolbarCSSPrefix}spacedList`);

		const thicknessRow = document.createElement('div');

		// Thickness: Value of the input is squared to allow for finer control/larger values.
		const thicknessLabel = document.createElement('label');
		const thicknessInput = document.createElement('input');
		const penTypeSelect = this.createPenTypeSelector();

		// Give inputs IDs so we can label them with a <label for=...>Label text</label>
		thicknessInput.id = `${toolbarCSSPrefix}penThicknessInput${PenToolWidget.idCounter++}`;

		thicknessLabel.innerText = this.localizationTable.thicknessLabel;
		thicknessLabel.setAttribute('for', thicknessInput.id);

		// Use a logarithmic scale for thicknessInput (finer control over thinner strokewidths.)
		const inverseThicknessInputFn = (t: number) => Math.log10(t);
		const thicknessInputFn = (t: number) => 10**t;

		thicknessInput.type = 'range';
		thicknessInput.min = `${inverseThicknessInputFn(2)}`;
		thicknessInput.max = `${inverseThicknessInputFn(400)}`;
		thicknessInput.step = '0.1';
		thicknessInput.oninput = () => {
			this.tool.setThickness(thicknessInputFn(parseFloat(thicknessInput.value)));
		};
		thicknessRow.appendChild(thicknessLabel);
		thicknessRow.appendChild(thicknessInput);

		const colorRow = document.createElement('div');
		const colorLabel = document.createElement('label');
		const [ colorInput, colorInputContainer, setColorInputValue ] = makeColorInput(this.editor, color => {
			this.tool.setColor(color);
		});

		colorInput.id = `${toolbarCSSPrefix}colorInput${PenToolWidget.idCounter++}`;
		colorLabel.innerText = this.localizationTable.colorLabel;
		colorLabel.setAttribute('for', colorInput.id);

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInputContainer);

		const advanced = this.createAdvancedOptions();

		this.updateInputs = () => {
			setColorInputValue(this.tool.getColor());
			thicknessInput.value = inverseThicknessInputFn(this.tool.getThickness()).toString();

			penTypeSelect.updateIcons();

			// Update the selected stroke factory.
			penTypeSelect.setValue(this.getCurrentPenTypeIdx());
			advanced.update();
		};
		this.updateInputs();

		container.replaceChildren(colorRow, thicknessRow);
		penTypeSelect.addTo(container);
		advanced.addTo(container);

		dropdown.replaceChildren(container);
		return true;
	}

	protected override onKeyPress(event: KeyPressEvent): boolean {
		if (!this.isSelected()) {
			return false;
		}

		for (let i = 0; i < selectStrokeTypeKeyboardShortcutIds.length; i++) {
			const shortcut = selectStrokeTypeKeyboardShortcutIds[i];
			if (this.editor.shortcuts.matchesShortcut(shortcut, event)) {
				const penTypeIdx = i;
				if (penTypeIdx < this.penTypes.length) {
					this.tool.setStrokeFactory(this.penTypes[penTypeIdx].factory);
					return true;
				}
			}
		}

		// Run any default actions registered by the parent class.
		if (super.onKeyPress(event)) {
			return true;
		}
		return false;
	}

	public override serializeState(): SavedToolbuttonState {
		return {
			...super.serializeState(),

			color: this.tool.getColor().toHexString(),
			thickness: this.tool.getThickness(),
			strokeFactoryId: this.getCurrentPenType()?.id,
			inputStabilization: !!this.tool.getInputMapper(),
		};
	}

	public override deserializeFrom(state: SavedToolbuttonState) {
		super.deserializeFrom(state);

		const verifyPropertyType = (propertyName: string, expectedType: 'string'|'number'|'object') => {
			const actualType = typeof(state[propertyName]);
			if (actualType !== expectedType) {
				throw new Error(
					`Deserializing property ${propertyName}: Invalid type. Expected ${expectedType},` +
					` was ${actualType}.`
				);
			}
		};

		if (state.color) {
			verifyPropertyType('color', 'string');
			this.tool.setColor(Color4.fromHex(state.color));
		}

		if (state.thickness) {
			verifyPropertyType('thickness', 'number');
			this.tool.setThickness(state.thickness);
		}

		if (state.strokeFactoryId) {
			verifyPropertyType('strokeFactoryId', 'string');

			const factoryId: string = state.strokeFactoryId;
			for (const penType of this.penTypes) {
				if (factoryId === penType.id) {
					this.tool.setStrokeFactory(penType.factory);
					break;
				}
			}
		}

		if (state.inputStabilization) {

		}
	}
}
