import Editor from '../Editor';
import { ToolType } from '../tools/ToolController';
import { EditorEventType } from '../types';

import { coloris, init as colorisInit } from '@melloware/coloris';
import Color4 from '../Color4';
import Pen from '../tools/Pen';
import Eraser from '../tools/Eraser';
import BaseTool from '../tools/BaseTool';
import SelectionTool from '../tools/SelectionTool';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import { ComponentBuilderFactory } from '../components/builders/types';
import { makeArrowBuilder } from '../components/builders/ArrowBuilder';
import { makeLineBuilder } from '../components/builders/LineBuilder';
import { makeFilledRectangleBuilder, makeOutlinedRectangleBuilder } from '../components/builders/RectangleBuilder';
import { defaultToolbarLocalization, ToolbarLocalization } from './localization';
import { ActionButtonIcon } from './types';
import { makeDropdownIcon, makeEraserIcon, makeIconFromFactory, makePenIcon, makeRedoIcon, makeSelectionIcon, makeHandToolIcon, makeUndoIcon, makeTextIcon } from './icons';
import PanZoom, { PanZoomMode } from '../tools/PanZoom';
import Mat33 from '../geometry/Mat33';
import Viewport from '../Viewport';
import TextTool from '../tools/TextTool';


const toolbarCSSPrefix = 'toolbar-';

abstract class ToolbarWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element|null;
	private dropdownContainer: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;
	private hasDropdown: boolean;

	public constructor(
		protected editor: Editor,
		protected targetTool: BaseTool,
		protected localizationTable: ToolbarLocalization,
	) {
		this.icon = null;
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');
		this.hasDropdown = false;

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');
		this.button.tabIndex = 0;

		editor.notifier.on(EditorEventType.ToolEnabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolEnabled) {
				throw new Error('Incorrect event type! (Expected ToolEnabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(true);
			}
		});

		editor.notifier.on(EditorEventType.ToolDisabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolDisabled) {
				throw new Error('Incorrect event type! (Expected ToolDisabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(false);
				this.setDropdownVisible(false);
			}
		});
	}

	protected abstract getTitle(): string;
	protected abstract createIcon(): Element;

	// Add content to the widget's associated dropdown menu.
	// Returns true if such a menu should be created, false otherwise.
	protected abstract fillDropdown(dropdown: HTMLElement): boolean;

	protected setupActionBtnClickListener(button: HTMLElement) {
		button.onclick = () => {
			this.handleClick();
		};
	}

	protected handleClick() {
		if (this.hasDropdown) {
			if (!this.targetTool.isEnabled()) {
				this.targetTool.setEnabled(true);
			} else {
				this.setDropdownVisible(!this.isDropdownVisible());
			}
		} else {
			this.targetTool.setEnabled(!this.targetTool.isEnabled());
		}
	}

	// Adds this to [parent]. This can only be called once for each ToolbarWidget.
	public addTo(parent: HTMLElement) {
		this.label.innerText = this.getTitle();

		this.setupActionBtnClickListener(this.button);

		this.icon = null;
		this.updateIcon();

		this.updateSelected(this.targetTool.isEnabled());

		this.button.replaceChildren(this.icon!, this.label);
		this.container.appendChild(this.button);

		this.hasDropdown = this.fillDropdown(this.dropdownContainer);
		if (this.hasDropdown) {
			this.dropdownIcon = this.createDropdownIcon();
			this.button.appendChild(this.dropdownIcon);
			this.container.appendChild(this.dropdownContainer);
		}

		this.setDropdownVisible(false);
		parent.appendChild(this.container);
	}

	protected updateIcon() {
		const newIcon = this.createIcon();
		this.icon?.replaceWith(newIcon);
		this.icon = newIcon;
		this.icon.classList.add(`${toolbarCSSPrefix}icon`);
	}

	protected updateSelected(selected: boolean) {
		const currentlySelected = this.container.classList.contains('selected');
		if (currentlySelected === selected) {
			return;
		}

		if (selected) {
			this.container.classList.add('selected');
			this.button.ariaSelected = 'true';
		} else {
			this.container.classList.remove('selected');
			this.button.ariaSelected = 'false';
		}
	}

	protected setDropdownVisible(visible: boolean) {
		const currentlyVisible = this.container.classList.contains('dropdownVisible');
		if (currentlyVisible === visible) {
			return;
		}

		if (visible) {
			this.dropdownContainer.classList.remove('hidden');
			this.container.classList.add('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownShown(this.targetTool.description)
			);
		} else {
			this.dropdownContainer.classList.add('hidden');
			this.container.classList.remove('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownHidden(this.targetTool.description)
			);
		}

		this.repositionDropdown();
	}

	protected repositionDropdown() {
		const dropdownBBox = this.dropdownContainer.getBoundingClientRect();
		const screenWidth = document.body.clientWidth;

		if (dropdownBBox.left > screenWidth / 2) {
			this.dropdownContainer.style.marginLeft = this.button.clientWidth + 'px';
			this.dropdownContainer.style.transform = 'translate(-100%, 0)';
		} else {
			this.dropdownContainer.style.marginLeft = '';
			this.dropdownContainer.style.transform = '';
		}
	}

	protected isDropdownVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}

	private createDropdownIcon(): Element {
		const icon = makeDropdownIcon();
		icon.classList.add(`${toolbarCSSPrefix}showHideDropdownIcon`);
		return icon;
	}
}

class EraserWidget extends ToolbarWidget {
	protected getTitle(): string {
		return this.localizationTable.eraser;
	}
	protected createIcon(): Element {
		return makeEraserIcon();
	}

	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown associated with the eraser
		return false;
	}
}

class SelectionWidget extends ToolbarWidget {
	public constructor(
		editor: Editor, private tool: SelectionTool, localization: ToolbarLocalization
	) {
		super(editor, tool, localization);
	}

	protected getTitle(): string {
		return this.localizationTable.select;
	}

	protected createIcon(): Element {
		return makeSelectionIcon();
	}

	protected fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		const resizeButton = document.createElement('button');
		const deleteButton = document.createElement('button');

		resizeButton.innerText = this.localizationTable.resizeImageToSelection;
		resizeButton.disabled = true;
		deleteButton.innerText = this.localizationTable.deleteSelection;
		deleteButton.disabled = true;

		resizeButton.onclick = () => {
			const selection = this.tool.getSelection();
			this.editor.dispatch(this.editor.setImportExportRect(selection!.region));
		};

		deleteButton.onclick = () => {
			const selection = this.tool.getSelection();
			this.editor.dispatch(selection!.deleteSelectedObjects());
			this.tool.clearSelection();
		};

		// Enable/disable actions based on whether items are selected
		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = selection && selection.region.area > 0;

				resizeButton.disabled = !hasSelection;
				deleteButton.disabled = resizeButton.disabled;
			}
		});

		container.replaceChildren(resizeButton, deleteButton);
		dropdown.appendChild(container);
		return true;
	}
}

const makeZoomControl = (localizationTable: ToolbarLocalization, editor: Editor) => {
	const zoomLevelRow = document.createElement('div');

	const increaseButton = document.createElement('button');
	const decreaseButton = document.createElement('button');
	const zoomLevelDisplay = document.createElement('span');
	increaseButton.innerText = '+';
	decreaseButton.innerText = '-';
	zoomLevelRow.replaceChildren(zoomLevelDisplay, increaseButton, decreaseButton);

	zoomLevelRow.classList.add(`${toolbarCSSPrefix}zoomLevelEditor`);
	zoomLevelDisplay.classList.add('zoomDisplay');

	let lastZoom: number|undefined;
	const updateZoomDisplay = () => {
		let zoomLevel = editor.viewport.getScaleFactor() * 100;

		if (zoomLevel > 0.1) {
			zoomLevel = Math.round(zoomLevel * 10) / 10;
		} else {
			zoomLevel = Math.round(zoomLevel * 1000) / 1000;
		}

		if (zoomLevel !== lastZoom) {
			zoomLevelDisplay.innerText = localizationTable.zoomLevel(zoomLevel);
			lastZoom = zoomLevel;
		}
	};
	updateZoomDisplay();

	editor.notifier.on(EditorEventType.ViewportChanged, (event) => {
		if (event.kind === EditorEventType.ViewportChanged) {
			updateZoomDisplay();
		}
	});

	const zoomBy = (factor: number) => {
		const screenCenter = editor.viewport.visibleRect.center;
		const transformUpdate = Mat33.scaling2D(factor, screenCenter);
		editor.dispatch(new Viewport.ViewportTransform(transformUpdate), false);
	};

	increaseButton.onclick = () => {
		zoomBy(5.0/4);
	};

	decreaseButton.onclick = () => {
		zoomBy(4.0/5);
	};

	return zoomLevelRow;
};

class HandToolWidget extends ToolbarWidget {
	public constructor(
		editor: Editor, protected tool: PanZoom, localizationTable: ToolbarLocalization
	) {
		super(editor, tool, localizationTable);
		this.container.classList.add('dropdownShowable');
	}
	protected getTitle(): string {
		return this.localizationTable.handTool;
	}

	protected createIcon(): Element {
		return makeHandToolIcon();
	}

	protected fillDropdown(dropdown: HTMLElement): boolean {
		type OnToggle = (checked: boolean)=>void;
		let idCounter = 0;
		const addCheckbox = (label: string, onToggle: OnToggle) => {
			const rowContainer = document.createElement('div');
			const labelElem = document.createElement('label');
			const checkboxElem = document.createElement('input');

			checkboxElem.type = 'checkbox';
			checkboxElem.id = `${toolbarCSSPrefix}hand-tool-option-${idCounter++}`;
			labelElem.setAttribute('for', checkboxElem.id);

			checkboxElem.oninput = () => {
				onToggle(checkboxElem.checked);
			};
			labelElem.innerText = label;

			rowContainer.replaceChildren(checkboxElem, labelElem);
			dropdown.appendChild(rowContainer);

			return checkboxElem;
		};

		const setModeFlag = (enabled: boolean, flag: PanZoomMode) => {
			const mode = this.tool.getMode();
			if (enabled) {
				this.tool.setMode(mode | flag);
			} else {
				this.tool.setMode(mode & ~flag);
			}
		};

		const touchPanningCheckbox = addCheckbox(this.localizationTable.touchPanning, checked => {
			setModeFlag(checked, PanZoomMode.OneFingerTouchGestures);
		});

		const anyDevicePanningCheckbox = addCheckbox(this.localizationTable.anyDevicePanning, checked => {
			setModeFlag(checked, PanZoomMode.SinglePointerGestures);
		});

		dropdown.appendChild(makeZoomControl(this.localizationTable, this.editor));

		const updateInputs = () => {
			const mode = this.tool.getMode();
			anyDevicePanningCheckbox.checked = !!(mode & PanZoomMode.SinglePointerGestures);
			if (anyDevicePanningCheckbox.checked) {
				touchPanningCheckbox.checked = true;
				touchPanningCheckbox.disabled = true;
			} else {
				touchPanningCheckbox.checked = !!(mode & PanZoomMode.OneFingerTouchGestures);
				touchPanningCheckbox.disabled = false;
			}
		};

		updateInputs();
		this.editor.notifier.on(EditorEventType.ToolUpdated, event => {
			if (event.kind === EditorEventType.ToolUpdated && event.tool === this.tool) {
				updateInputs();
			}
		});

		return true;
	}

	protected updateSelected(_active: boolean) {
	}

	protected handleClick() {
		this.setDropdownVisible(!this.isDropdownVisible());
	}
}

class TextToolWidget extends ToolbarWidget {
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

		const colorInput = document.createElement('input');
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

		colorInput.classList.add('coloris_input');
		colorInput.type = 'button';
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

		colorInput.oninput = () => {
			this.tool.setColor(Color4.fromString(colorInput.value));
		};

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInput);

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

class PenWidget extends ToolbarWidget {
	private updateInputs: ()=> void = () => {};

	public constructor(
		editor: Editor, private tool: Pen, localization: ToolbarLocalization, private penTypes: PenTypeRecord[]
	) {
		super(editor, tool, localization);

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
		thicknessInput.min = '1';
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
		const colorInput = document.createElement('input');

		colorInput.id = `${toolbarCSSPrefix}colorInput${PenWidget.idCounter++}`;
		colorLabel.innerText = this.localizationTable.colorLabel;
		colorLabel.setAttribute('for', colorInput.id);

		colorInput.className = 'coloris_input';
		colorInput.type = 'button';
		colorInput.oninput = () => {
			this.tool.setColor(Color4.fromHex(colorInput.value));
		};
		colorInput.addEventListener('open', () => {
			this.editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
				kind: EditorEventType.ColorPickerToggled,
				open: true,
			});
		});
		colorInput.addEventListener('close', () => {
			this.editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
				kind: EditorEventType.ColorPickerToggled,
				open: false,
			});
		});

		colorRow.appendChild(colorLabel);
		colorRow.appendChild(colorInput);

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

interface PenTypeRecord {
	name: string;
	factory: ComponentBuilderFactory;
}

export default class HTMLToolbar {
	private container: HTMLElement;
	private penTypes: PenTypeRecord[];

	public constructor(
		private editor: Editor, parent: HTMLElement,
		private localizationTable: ToolbarLocalization = defaultToolbarLocalization,
	) {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}root`);
		this.container.setAttribute('role', 'toolbar');
		parent.appendChild(this.container);

		colorisInit();
		this.setupColorPickers();

		// Default pen types
		this.penTypes = [
			{
				name: localizationTable.freehandPen,
				factory: makeFreehandLineBuilder,
			},
			{
				name: localizationTable.arrowPen,
				factory: makeArrowBuilder,
			},
			{
				name: localizationTable.linePen,
				factory: makeLineBuilder,
			},
			{
				name: localizationTable.filledRectanglePen,
				factory: makeFilledRectangleBuilder,
			},
			{
				name: localizationTable.outlinedRectanglePen,
				factory: makeOutlinedRectangleBuilder,
			},
		];
	}

	public setupColorPickers() {
		const closePickerOverlay = document.createElement('div');
		closePickerOverlay.className = `${toolbarCSSPrefix}closeColorPickerOverlay`;
		this.editor.createHTMLOverlay(closePickerOverlay);

		coloris({
			el: '.coloris_input',
			format: 'hex',
			selectInput: false,
			focusInput: false,
			themeMode: 'auto',

			swatches: [
				Color4.red.toHexString(),
				Color4.purple.toHexString(),
				Color4.blue.toHexString(),
				Color4.clay.toHexString(),
				Color4.black.toHexString(),
				Color4.white.toHexString(),
			],
		});

		this.editor.notifier.on(EditorEventType.ColorPickerToggled, event => {
			if (event.kind !== EditorEventType.ColorPickerToggled) {
				return;
			}

			// Show/hide the overlay. Making the overlay visible gives users a surface to click
			// on that shows/hides the color picker.
			closePickerOverlay.style.display = event.open ? 'block' : 'none';
		});
	}

	public addActionButton(title: string|ActionButtonIcon, command: ()=> void, parent?: Element) {
		const button = document.createElement('button');
		button.classList.add(`${toolbarCSSPrefix}toolButton`);

		if (typeof title === 'string') {
			button.innerText = title;
		} else {
			const iconElem = title.icon.cloneNode(true) as HTMLElement;
			const labelElem = document.createElement('label');

			// Use the label to describe the icon -- no additional description should be necessary.
			iconElem.setAttribute('alt', '');
			labelElem.innerText = title.label;
			iconElem.classList.add('toolbar-icon');

			button.replaceChildren(iconElem, labelElem);
		}

		button.onclick = command;
		(parent ?? this.container).appendChild(button);

		return button;
	}

	private addUndoRedoButtons() {
		const undoRedoGroup = document.createElement('div');
		undoRedoGroup.classList.add(`${toolbarCSSPrefix}buttonGroup`);

		const undoButton = this.addActionButton({
			label: 'Undo',
			icon: makeUndoIcon()
		}, () => {
			this.editor.history.undo();
		}, undoRedoGroup);
		const redoButton = this.addActionButton({
			label: 'Redo',
			icon: makeRedoIcon(),
		}, () => {
			this.editor.history.redo();
		}, undoRedoGroup);
		this.container.appendChild(undoRedoGroup);

		undoButton.disabled = true;
		redoButton.disabled = true;
		this.editor.notifier.on(EditorEventType.UndoRedoStackUpdated, event => {
			if (event.kind !== EditorEventType.UndoRedoStackUpdated) {
				throw new Error('Wrong event type!');
			}

			undoButton.disabled = event.undoStackSize === 0;
			redoButton.disabled = event.redoStackSize === 0;
		});
	}

	public addDefaultToolWidgets() {
		const toolController = this.editor.toolController;
		for (const tool of toolController.getMatchingTools(ToolType.Pen)) {
			if (!(tool instanceof Pen)) {
				throw new Error('All `Pen` tools must have kind === ToolType.Pen');
			}

			const widget = new PenWidget(
				this.editor, tool, this.localizationTable, this.penTypes,
			);
			widget.addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Eraser)) {
			if (!(tool instanceof Eraser)) {
				throw new Error('All Erasers must have kind === ToolType.Eraser!');
			}

			(new EraserWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Selection)) {
			if (!(tool instanceof SelectionTool)) {
				throw new Error('All SelectionTools must have kind === ToolType.Selection');
			}

			(new SelectionWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.Text)) {
			if (!(tool instanceof TextTool)) {
				throw new Error('All text tools must have kind === ToolType.Text');
			}
	
			(new TextToolWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		for (const tool of toolController.getMatchingTools(ToolType.PanZoom)) {
			if (!(tool instanceof PanZoom)) {
				throw new Error('All SelectionTools must have kind === ToolType.PanZoom');
			}
	
			(new HandToolWidget(this.editor, tool, this.localizationTable)).addTo(this.container);
		}

		this.setupColorPickers();
	}

	public addDefaultActionButtons() {
		this.addUndoRedoButtons();
	}
}
