import Editor from '../Editor';
import { ToolType } from '../tools/ToolController';
import { EditorEventType } from '../types';

import { coloris, init as colorisInit } from '@melloware/coloris';
import Color4 from '../Color4';
import Pen from '../tools/Pen';
import Eraser from '../tools/Eraser';
import SelectionTool from '../tools/SelectionTool';
import { defaultToolbarLocalization, ToolbarLocalization } from './localization';
import { ActionButtonIcon } from './types';
import { makeRedoIcon, makeUndoIcon } from './icons';
import PanZoom from '../tools/PanZoom';
import TextTool from '../tools/TextTool';
import PenWidget from './widgets/PenWidget';
import EraserWidget from './widgets/EraserWidget';
import { SelectionWidget } from './widgets/SelectionWidget';
import TextToolWidget from './widgets/TextToolWidget';
import HandToolWidget from './widgets/HandToolWidget';


export const toolbarCSSPrefix = 'toolbar-';


export default class HTMLToolbar {
	private container: HTMLElement;

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
	}

	public setupColorPickers() {
		const closePickerOverlay = document.createElement('div');
		closePickerOverlay.className = `${toolbarCSSPrefix}closeColorPickerOverlay`;
		this.editor.createHTMLOverlay(closePickerOverlay);

		const maxSwatchLen = 12;
		const swatches = [
			Color4.red.toHexString(),
			Color4.purple.toHexString(),
			Color4.blue.toHexString(),
			Color4.clay.toHexString(),
			Color4.black.toHexString(),
			Color4.white.toHexString(),
		];
		const presetColorEnd = swatches.length;

		// (Re)init Coloris -- update the swatches list.
		const initColoris = () => {
			coloris({
				el: '.coloris_input',
				format: 'hex',
				selectInput: false,
				focusInput: false,
				themeMode: 'auto',

				swatches
			});
		};
		initColoris();

		const addColorToSwatch = (newColor: string) => {
			let alreadyPresent = false;

			for (const color of swatches) {
				if (color === newColor) {
					alreadyPresent = true;
				}
			}

			if (!alreadyPresent) {
				swatches.push(newColor);
				if (swatches.length > maxSwatchLen) {
					swatches.splice(presetColorEnd, 1);
				}
				initColoris();
			}
		};

		this.editor.notifier.on(EditorEventType.ColorPickerToggled, event => {
			if (event.kind !== EditorEventType.ColorPickerToggled) {
				return;
			}

			// Show/hide the overlay. Making the overlay visible gives users a surface to click
			// on that shows/hides the color picker.
			closePickerOverlay.style.display = event.open ? 'block' : 'none';
		});

		// Add newly-selected colors to the swatch.
		this.editor.notifier.on(EditorEventType.ColorPickerColorSelected, event => {
			if (event.kind === EditorEventType.ColorPickerColorSelected) {
				addColorToSwatch(event.color.toHexString());
			}
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
				this.editor, tool, this.localizationTable,
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
