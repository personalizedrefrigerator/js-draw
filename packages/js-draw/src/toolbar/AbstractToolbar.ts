import Editor from '../Editor';
import { EditorEventType } from '../types';
import { HTMLPointerEventName } from '../inputEvents';

import { coloris, close as closeColoris, init as colorisInit } from '@melloware/coloris';
import { defaultToolbarLocalization, ToolbarLocalization } from './localization';
import { ActionButtonIcon } from './types';
import SelectionTool from '../tools/SelectionTool/SelectionTool';
import PanZoomTool from '../tools/PanZoom';
import TextTool from '../tools/TextTool';
import EraserTool from '../tools/Eraser';
import PenTool from '../tools/Pen';
import PenToolWidget from './widgets/PenToolWidget';
import EraserWidget from './widgets/EraserToolWidget';
import SelectionToolWidget from './widgets/SelectionToolWidget';
import TextToolWidget from './widgets/TextToolWidget';
import HandToolWidget from './widgets/HandToolWidget';
import BaseWidget from './widgets/BaseWidget';
import ActionButtonWidget from './widgets/ActionButtonWidget';
import InsertImageWidget from './widgets/InsertImageWidget';
import DocumentPropertiesWidget from './widgets/DocumentPropertiesWidget';
import { DispatcherEventListener } from '../EventDispatcher';
import { Point2, Vec2, Color4 } from '@js-draw/math';
import { toolbarCSSPrefix } from './constants';

type UpdateColorisCallback = ()=>void;
type WidgetByIdMap = Record<string, BaseWidget>;

export interface SpacerOptions {
	// Defaults to 0. If a non-zero number, determines the rate at which the
	// spacer should grow (like flexGrow).
	grow: number;

	// Minimum size (e.g. "23px")
	minSize: string;

	// Maximum size (e.g. "50px")
	maxSize: string;
}

export default abstract class AbstractToolbar {
	#listeners: DispatcherEventListener[] = [];

	#widgetsById: WidgetByIdMap = {};
	#widgetList: Array<BaseWidget> = [];

	private static colorisStarted: boolean = false;
	#updateColoris: UpdateColorisCallback|null = null;

	/** @internal */
	public constructor(
		protected editor: Editor, protected localizationTable: ToolbarLocalization = defaultToolbarLocalization,
	) {
		if (!AbstractToolbar.colorisStarted) {
			colorisInit();
			AbstractToolbar.colorisStarted = true;
		}
		this.setupColorPickers();
	}

	private closeColorPickerOverlay: HTMLElement|null = null;
	private setupCloseColorPickerOverlay() {
		if (this.closeColorPickerOverlay) return;

		this.closeColorPickerOverlay = document.createElement('div');
		this.closeColorPickerOverlay.className = `${toolbarCSSPrefix}closeColorPickerOverlay`;
		this.editor.createHTMLOverlay(this.closeColorPickerOverlay);

		// Buffer events: Send events to the editor only if the pointer has moved enough to
		// suggest that the user is attempting to draw, rather than click to close the color picker.
		let eventBuffer: [ HTMLPointerEventName, PointerEvent ][] = [];
		let gestureStartPos: Point2|null = null;

		// Hide the color picker when attempting to draw on the overlay.
		this.#listeners.push(this.editor.handlePointerEventsFrom(this.closeColorPickerOverlay, (eventName, event) => {
			// Position of the current event.
			const currentPos = Vec2.of(event.pageX, event.pageY);

			// Whether to send the current event to the editor
			let sendToEditor = true;

			if (eventName === 'pointerdown') {
				closeColoris();

				// Buffer the event, but don't send it to the editor yet.
				// We don't want to send single-click events, but we do want to send full strokes.
				eventBuffer = [];
				eventBuffer.push([ eventName, event ]);
				gestureStartPos = currentPos;

				// Capture the pointer so we receive future events even if the overlay is hidden.
				this.closeColorPickerOverlay?.setPointerCapture(event.pointerId);

				// Don't send to the editor.
				sendToEditor = false;
			}
			else if (eventName === 'pointermove') {
				// Skip if the pointer hasn't moved enough to not be a "click".
				const strokeStartThreshold = 10;
				if (gestureStartPos && currentPos.minus(gestureStartPos).magnitude() < strokeStartThreshold) {
					eventBuffer.push([ eventName, event ]);
					sendToEditor = false;
				} else {
					// Send all buffered events to the editor -- start the stroke.
					for (const [ eventName, event ] of eventBuffer) {
						this.editor.handleHTMLPointerEvent(eventName, event);
					}

					eventBuffer = [];
					sendToEditor = true;
				}
			}
			// Otherwise, if we received a pointerup/pointercancel without flushing all pointerevents from the
			// buffer, the gesture wasn't recognised as a stroke. Thus, the editor isn't expecting a pointerup/
			// pointercancel event.
			else if ((eventName === 'pointerup' || eventName === 'pointercancel') && eventBuffer.length > 0) {
				this.closeColorPickerOverlay?.releasePointerCapture(event.pointerId);
				eventBuffer = [];

				// Don't send to the editor.
				sendToEditor = false;
			}

			// Transfer focus to the editor to allow keyboard events to be handled.
			if (eventName === 'pointerup') {
				this.editor.focus();
			}

			// Forward all other events to the editor.
			return sendToEditor;
		}));
	}

	// @internal
	public setupColorPickers() {
		// Much of the setup only needs to be done once.
		if (this.#updateColoris) {
			this.#updateColoris();
			return;
		}

		this.setupCloseColorPickerOverlay();

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
		this.#updateColoris = initColoris;

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

		this.#listeners.push(this.editor.notifier.on(EditorEventType.ColorPickerToggled, event => {
			if (event.kind !== EditorEventType.ColorPickerToggled) {
				return;
			}

			// Show/hide the overlay. Making the overlay visible gives users a surface to click
			// on that shows/hides the color picker.
			if (this.closeColorPickerOverlay) {
				this.closeColorPickerOverlay.style.display = event.open ? 'block' : 'none';
			}
		}));

		// Add newly-selected colors to the swatch.
		this.#listeners.push(this.editor.notifier.on(EditorEventType.ColorPickerColorSelected, event => {
			if (event.kind === EditorEventType.ColorPickerColorSelected) {
				addColorToSwatch(event.color.toHexString());
			}
		}));
	}

	protected getWidgetUniqueId(widget: BaseWidget) {
		return widget.getUniqueIdIn(this.#widgetsById);
	}

	protected getWidgetFromId(id: string): BaseWidget|undefined {
		return this.#widgetsById[id];
	}

	/** Do **not** modify the return value. */
	protected getAllWidgets(): Array<BaseWidget> {
		return this.#widgetList;
	}

	/**
	 * Adds a spacer.
	 *
	 * @example
	 * Adding a save button that moves to the very right edge of the toolbar
	 * while keeping the other buttons centered:
	 * ```ts
	 * const toolbar = editor.addToolbar(false);
	 *
	 * toolbar.addSpacer({ grow: 1 });
	 * toolbar.addDefaults();
	 * toolbar.addSpacer({ grow: 1 });
	 *
	 * toolbar.addActionButton({
	 * 	label: 'Save',
	 * 	icon: editor.icons.makeSaveIcon(),
	 * }, () => {
	 * 	  saveCallback();
	 * });
	 * ```
	 */
	public abstract addSpacer(options?: Partial<SpacerOptions>): void;

	/**
	 * Adds an `ActionButtonWidget` or `BaseToolWidget`. The widget should not have already have a parent
	 * (i.e. its `addTo` method should not have been called).
	 *
	 * @example
	 * ```ts
	 * const toolbar = editor.addToolbar();
	 * const insertImageWidget = new InsertImageWidget(editor);
	 * toolbar.addWidget(insertImageWidget);
	 * ```
	 */
	public addWidget(widget: BaseWidget) {
		// Prevent name collisions
		const id = widget.getUniqueIdIn(this.#widgetsById);

		// Add the widget
		this.#widgetsById[id] = widget;
		this.#widgetList.push(widget);

		this.addWidgetInternal(widget);
		this.setupColorPickers();
	}

	/** Called by `addWidget`. Implement this to add a new widget to the toolbar. */
	protected abstract addWidgetInternal(widget: BaseWidget): void;

	/** Removes the given `widget` from this toolbar. */
	public removeWidget(widget: BaseWidget) {
		const id = widget.getUniqueIdIn(this.#widgetsById);
		this.removeWidgetInternal(widget);

		delete this.#widgetsById[id];
		this.#widgetList = this.#widgetList.filter(otherWidget => otherWidget !== widget);
	}


	/** Called by `removeWidget`. Implement this to remove a new widget from the toolbar. */
	protected abstract removeWidgetInternal(widget: BaseWidget): void;

	/** Returns a snapshot of the state of widgets in the toolbar. */
	public serializeState(): string {
		const result: Record<string, any> = {};

		for (const widgetId in this.#widgetsById) {
			result[widgetId] = this.#widgetsById[widgetId].serializeState();
		}

		return JSON.stringify(result);
	}

	/**
	 * Deserialize toolbar widgets from the given state.
	 * Assumes that toolbar widgets are in the same order as when state was serialized.
	 */
	public deserializeState(state: string) {
		const data = JSON.parse(state);

		for (const widgetId in data) {
			if (!(widgetId in this.#widgetsById)) {
				console.warn(`Unable to deserialize widget ${widgetId} ­— no such widget.`);
			}

			this.#widgetsById[widgetId].deserializeFrom(data[widgetId]);
		}
	}

	/**
	 * Adds an action button with `title` to this toolbar (or to the given `parent` element).
	 *
	 * @return The added button.
	 */
	public addActionButton(
		title: string|ActionButtonIcon,
		command: ()=> void,
		mustBeToplevel: boolean = true
	): BaseWidget {
		const titleString = typeof title === 'string' ? title : title.label;
		const widgetId = 'action-button';

		const makeIcon = () => {
			if (typeof title === 'string') {
				return null;
			}

			return title.icon;
		};

		const widget = new ActionButtonWidget(
			this.editor,
			widgetId,
			makeIcon,
			titleString,
			command,
			this.editor.localization,
			mustBeToplevel,
		);

		this.addWidget(widget);
		return widget;
	}

	public addUndoRedoButtons() {
		const undoButton = this.addActionButton({
			label: this.localizationTable.undo,
			icon: this.editor.icons.makeUndoIcon()
		}, () => {
			this.editor.history.undo();
		});
		const redoButton = this.addActionButton({
			label: this.localizationTable.redo,
			icon: this.editor.icons.makeRedoIcon(),
		}, () => {
			this.editor.history.redo();
		});

		undoButton.setDisabled(true);
		redoButton.setDisabled(true);
		this.editor.notifier.on(EditorEventType.UndoRedoStackUpdated, event => {
			if (event.kind !== EditorEventType.UndoRedoStackUpdated) {
				throw new Error('Wrong event type!');
			}

			undoButton.setDisabled(event.undoStackSize === 0);
			redoButton.setDisabled(event.redoStackSize === 0);
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

		const panZoomTool = toolController.getMatchingTools(PanZoomTool)[0];
		if (panZoomTool) {
			this.addWidget(new HandToolWidget(this.editor, panZoomTool, this.localizationTable));
		}

		this.addWidget(new InsertImageWidget(this.editor, this.localizationTable));
	}

	public addDefaultActionButtons() {
		this.addWidget(new DocumentPropertiesWidget(this.editor, this.localizationTable));
		this.addUndoRedoButtons();
	}

	/**
	 * Adds both the default tool widgets and action buttons. Equivalent to
	 * ```ts
	 * toolbar.addDefaultToolWidgets();
	 * toolbar.addOverflowWidget();
	 * toolbar.addDefaultActionButtons();
	 * ```
	 */
	public abstract addDefaults(): void;

	/** Remove this toolbar from its container and clean up listeners. */
	public remove() {
		this.closeColorPickerOverlay?.remove();

		for (const listener of this.#listeners) {
			listener.remove();
		}

		this.onRemove();
	}

	/**
	 * Internal logic for {@link remove}. Implementers should remove the toolbar
	 * from its container.
	 */
	protected abstract onRemove(): void;
}
