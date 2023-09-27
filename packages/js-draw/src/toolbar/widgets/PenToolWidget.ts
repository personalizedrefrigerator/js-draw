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
import { ToolbarLocalization } from '../localization';
import makeColorInput from './components/makeColorInput';
import BaseToolWidget from './BaseToolWidget';
import { Color4 } from '@js-draw/math';
import { SavedToolbuttonState } from './BaseWidget';
import { selectStrokeTypeKeyboardShortcutIds } from './keybindings';
import { toolbarCSSPrefix } from '../constants';
import makeThicknessSlider from './components/makeThicknessSlider';
import makeGridSelector from './components/makeGridSelector';

export interface PenTypeRecord {
	// Description of the factory (e.g. 'Freehand line')
	name: string;

	// A unique ID for the facotory (e.g. 'chisel-tip-pen')
	id: string;

	// True if the pen type generates shapes (and should thus be shown in the GUI
	// as a shape generator). Defaults to false.
	isShapeBuilder?: boolean;

	// Creates an `AbstractComponent` from pen input.
	factory: ComponentBuilderFactory;
}

export default class PenToolWidget extends BaseToolWidget {
	private updateInputs: ()=> void = () => {};
	protected penTypes: PenTypeRecord[];
	protected shapelikeIDs: string[];

	// A counter variable that ensures different HTML elements are given unique names/ids.
	private static idCounter: number = 0;

	public constructor(
		editor: Editor, private tool: Pen, localization?: ToolbarLocalization
	) {
		super(editor, tool, 'pen', localization);

		// Pen types that correspond to
		this.shapelikeIDs = [ 'pressure-sensitive-pen', 'freehand-pen' ];

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

				isShapeBuilder: true,
				factory: makeArrowBuilder,
			},
			{
				name: this.localizationTable.linePen,
				id: 'line',

				isShapeBuilder: true,
				factory: makeLineBuilder,
			},
			{
				name: this.localizationTable.filledRectanglePen,
				id: 'filled-rectangle',

				isShapeBuilder: true,
				factory: makeFilledRectangleBuilder,
			},
			{
				name: this.localizationTable.outlinedRectanglePen,
				id: 'outlined-rectangle',

				isShapeBuilder: true,
				factory: makeOutlinedRectangleBuilder,
			},
			{
				name: this.localizationTable.outlinedCirclePen,
				id: 'outlined-circle',

				isShapeBuilder: true,
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
		const style = {
			...this.tool.getStyleValue().get(),
		};

		if (record?.factory) {
			style.factory = record.factory;
		}

		const strokeFactory = record?.factory;
		if (!strokeFactory || strokeFactory === makeFreehandLineBuilder || strokeFactory === makePressureSensitiveFreehandLineBuilder) {
			return this.editor.icons.makePenIcon(style);
		} else {
			return this.editor.icons.makeIconFromFactory(style);
		}
	}

	protected createIcon(): Element {
		return this.createIconForRecord(this.getCurrentPenType());
	}


	// Creates a widget that allows selecting different pen types
	private createPenTypeSelector() {
		const allChoices = this.penTypes.map((penType, index) => {
			return {
				id: index,
				makeIcon: () => this.createIconForRecord(penType),
				title: penType.name,
				isShapeBuilder: penType.isShapeBuilder ?? false,
			};
		});

		const penSelector = makeGridSelector(
			this.localizationTable.selectPenTip,
			this.getCurrentPenTypeIdx(),
			allChoices.filter(choice => !choice.isShapeBuilder),
		);

		const shapeSelector = makeGridSelector(
			this.localizationTable.selectShape,
			this.getCurrentPenTypeIdx(),
			allChoices.filter(choice => choice.isShapeBuilder),
		);

		const onSelectorUpdate = (newPenTypeIndex: number) => {
			this.tool.setStrokeFactory(this.penTypes[newPenTypeIndex].factory);
		};

		penSelector.value.onUpdate(onSelectorUpdate);
		shapeSelector.value.onUpdate(onSelectorUpdate);

		return {
			setValue: (penTypeIndex: number) => {
				penSelector.value.set(penTypeIndex);
				shapeSelector.value.set(penTypeIndex);
			},

			updateIcons: () => {
				penSelector.updateIcons();
				shapeSelector.updateIcons();
			},

			addTo: (parent: HTMLElement) => {
				penSelector.addTo(parent);
				shapeSelector.addTo(parent);
			},
		};
	}

	private setInputStabilizationEnabled(enabled: boolean) {
		this.tool.setHasStabilization(enabled);
	}

	protected createStabilizationOption() {
		const stabilizationOption = document.createElement('div');
		const stabilizationCheckbox = document.createElement('input');
		const stabilizationLabel = document.createElement('label');
		stabilizationLabel.innerText = this.localizationTable.inputStabilization;

		stabilizationCheckbox.type = 'checkbox';
		stabilizationCheckbox.id = `${toolbarCSSPrefix}-penInputStabilizationCheckbox-${PenToolWidget.idCounter++}`;
		stabilizationLabel.htmlFor = stabilizationCheckbox.id;

		stabilizationOption.replaceChildren(stabilizationLabel, stabilizationCheckbox);

		stabilizationCheckbox.oninput = () => {
			this.setInputStabilizationEnabled(stabilizationCheckbox.checked);
		};

		return {
			update: () => {
				stabilizationCheckbox.checked = !!this.tool.getInputMapper();
			},

			addTo: (parent: HTMLElement) => {
				parent.appendChild(stabilizationOption);
			}
		};
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add(
			`${toolbarCSSPrefix}spacedList`, `${toolbarCSSPrefix}nonbutton-controls-main-list`
		);

		// Thickness: Value of the input is squared to allow for finer control/larger values.
		const { container: thicknessRow, setValue: setThickness } = makeThicknessSlider(this.editor, thickness => {
			this.tool.setThickness(thickness);
		});

		const penTypeSelect = this.createPenTypeSelector();

		const colorRow = document.createElement('div');
		const colorLabel = document.createElement('label');
		const {
			input: colorInput, container: colorInputContainer, setValue: setColorInputValue
		} = makeColorInput(this.editor, color => {
			this.tool.setColor(color);
		});

		colorInput.id = `${toolbarCSSPrefix}colorInput${PenToolWidget.idCounter++}`;
		colorLabel.innerText = this.localizationTable.colorLabel;
		colorLabel.setAttribute('for', colorInput.id);

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInputContainer);

		const stabilizationOption = this.createStabilizationOption();

		this.updateInputs = () => {
			setColorInputValue(this.tool.getColor());
			setThickness(this.tool.getThickness());

			penTypeSelect.updateIcons();

			// Update the selected stroke factory.
			penTypeSelect.setValue(this.getCurrentPenTypeIdx());
			stabilizationOption.update();
		};
		this.updateInputs();

		container.replaceChildren(colorRow, thicknessRow);
		penTypeSelect.addTo(container);
		stabilizationOption.addTo(container);

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

		if (state.inputStabilization !== undefined) {
			this.setInputStabilizationEnabled(!!state.inputStabilization);
		}
	}
}
