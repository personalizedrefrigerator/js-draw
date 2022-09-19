import Editor from '../Editor';
import { EditorEventType } from '../types';

import { coloris, init as colorisInit } from '@melloware/coloris';
import Color4 from '../Color4';
import SelectionTool from '../tools/SelectionTool';
import { defaultToolbarLocalization, ToolbarLocalization } from './localization';
import { ActionButtonIcon } from './types';
import { makeRedoIcon, makeUndoIcon } from './icons';
import PanZoom from '../tools/PanZoom';
import TextTool from '../tools/TextTool';
import PenToolWidget from './widgets/PenToolWidget';
import EraserWidget from './widgets/EraserToolWidget';
import SelectionToolWidget from './widgets/SelectionToolWidget';
import TextToolWidget from './widgets/TextToolWidget';
import HandToolWidget from './widgets/HandToolWidget';
import BaseWidget from './widgets/BaseWidget';
import { EraserTool, PenTool } from '../tools/lib';


export const toolbarCSSPrefix = 'toolbar-';

type UpdateColorisCallback = ()=>void;

export default class HTMLToolbar {
	private container: HTMLElement;

	private static colorisStarted: boolean = false;
	private updateColoris: UpdateColorisCallback|null = null;

	public constructor(
		private editor: Editor, parent: HTMLElement,
		private localizationTable: ToolbarLocalization = defaultToolbarLocalization,
	) {
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}root`);
		this.container.setAttribute('role', 'toolbar');
		parent.appendChild(this.container);

		if (!HTMLToolbar.colorisStarted) {
			colorisInit();
			HTMLToolbar.colorisStarted = true;
		}
		this.setupColorPickers();
	}

	// @internal
	public setupColorPickers() {
		// Much of the setup only needs to be done once.
		if (this.updateColoris) {
			this.updateColoris();
			return;
		}

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
		this.updateColoris = initColoris;

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

	// Adds an `ActionButtonWidget` or `BaseToolWidget`. The widget should not have already have a parent
	// (i.e. its `addTo` method should not have been called).
	public addWidget(widget: BaseWidget) {
		widget.addTo(this.container);
		this.setupColorPickers();
	}

	public addActionButton(title: string|ActionButtonIcon, command: ()=> void, parent?: Element) {
		const button = document.createElement('button');
		button.classList.add(`${toolbarCSSPrefix}button`);

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

	public addUndoRedoButtons() {
		const undoRedoGroup = document.createElement('div');
		undoRedoGroup.classList.add(`${toolbarCSSPrefix}buttonGroup`);

		const undoButton = this.addActionButton({
			label: this.localizationTable.undo,
			icon: makeUndoIcon()
		}, () => {
			this.editor.history.undo();
		}, undoRedoGroup);
		const redoButton = this.addActionButton({
			label: this.localizationTable.redo,
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
		for (const tool of toolController.getMatchingTools(PenTool)) {
			const widget = new PenToolWidget(
				this.editor, tool, this.localizationTable,
			);
			this.addWidget(widget);
		}

		for (const tool of toolController.getMatchingTools(EraserTool)) {
			this.addWidget(new EraserWidget(this.editor, tool, this.localizationTable));
		}

		for (const tool of toolController.getMatchingTools(SelectionTool)) {
			this.addWidget(new SelectionToolWidget(this.editor, tool, this.localizationTable));
		}

		for (const tool of toolController.getMatchingTools(TextTool)) {
			this.addWidget(new TextToolWidget(this.editor, tool, this.localizationTable));
		}

		const panZoomTool = toolController.getMatchingTools(PanZoom)[0];
		if (panZoomTool) {
			this.addWidget(new HandToolWidget(this.editor, panZoomTool, this.localizationTable));
		}
	}

	public addDefaultActionButtons() {
		this.addUndoRedoButtons();
	}
}
