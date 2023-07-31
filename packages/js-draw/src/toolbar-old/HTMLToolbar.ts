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
import OverflowWidget from './widgets/OverflowWidget';
import { DispatcherEventListener } from '../EventDispatcher';
import { Point2, Vec2, Color4 } from '@js-draw/math';

export const toolbarCSSPrefix = 'toolbar-';

type UpdateColorisCallback = ()=>void;

interface SpacerOptions {
	// Defaults to 0. If a non-zero number, determines the rate at which the
	// spacer should grow (like flexGrow).
	grow: number;

	// Minimum size (e.g. "23px")
	minSize: string;

	// Maximum size (e.g. "50px")
	maxSize: string;
}

export default class HTMLToolbar {
	private container: HTMLElement;
	private resizeObserver: ResizeObserver;
	private listeners: DispatcherEventListener[] = [];

	// Flex-order of the next widget to be added.
	private widgetOrderCounter: number = 0;

	private widgetsById: Record<string, BaseWidget> = {};
	private widgetList: Array<BaseWidget> = [];

	// Widget to toggle overflow menu.
	private overflowWidget: OverflowWidget|null = null;

	private static colorisStarted: boolean = false;
	private updateColoris: UpdateColorisCallback|null = null;

	/** @internal */
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

		if ('ResizeObserver' in window) {
			this.resizeObserver = new ResizeObserver((_entries) => {
				this.reLayout();
			});
			this.resizeObserver.observe(this.container);
		} else {
			console.warn('ResizeObserver not supported. Toolbar will not resize.');
		}
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
		this.listeners.push(this.editor.handlePointerEventsFrom(this.closeColorPickerOverlay, (eventName, event) => {
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
		if (this.updateColoris) {
			this.updateColoris();
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

		this.listeners.push(this.editor.notifier.on(EditorEventType.ColorPickerToggled, event => {
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
		this.listeners.push(this.editor.notifier.on(EditorEventType.ColorPickerColorSelected, event => {
			if (event.kind === EditorEventType.ColorPickerColorSelected) {
				addColorToSwatch(event.color.toHexString());
			}
		}));
	}

	private reLayoutQueued: boolean = false;
	private queueReLayout() {
		if (!this.reLayoutQueued) {
			this.reLayoutQueued = true;
			requestAnimationFrame(() => this.reLayout());
		}
	}

	private reLayout() {
		this.reLayoutQueued = false;

		if (!this.overflowWidget) {
			return;
		}

		const getTotalWidth = (widgetList: Array<BaseWidget>) => {
			let totalWidth = 0;
			for (const widget of widgetList) {
				if (!widget.isHidden()) {
					totalWidth += widget.getButtonWidth();
				}
			}

			return totalWidth;
		};

		// Returns true if there is enough empty space to move the first child
		// from the overflow menu to the main menu.
		const canRemoveFirstChildFromOverflow = (freeSpaceInMainMenu: number) => {
			const overflowChildren = this.overflowWidget?.getChildWidgets() ?? [];

			if (overflowChildren.length === 0) {
				return false;
			}

			return overflowChildren[0].getButtonWidth() <= freeSpaceInMainMenu;
		};

		let overflowWidgetsWidth = getTotalWidth(this.overflowWidget.getChildWidgets());
		let shownWidgetWidth = getTotalWidth(this.widgetList) - overflowWidgetsWidth;
		let availableWidth = this.container.clientWidth * 0.87;

		// If on a device that has enough vertical space, allow
		// showing two rows of buttons.
		// TODO: Fix magic numbers
		if (window.innerHeight > availableWidth * 1.75) {
			availableWidth *= 1.75;
		}

		let updatedChildren = false;

		// If we can remove at least one child from the overflow menu,
		if (canRemoveFirstChildFromOverflow(availableWidth - shownWidgetWidth)) {
			// Move widgets to the main menu.
			const overflowChildren = this.overflowWidget.clearChildren();

			for (const child of overflowChildren) {
				child.addTo(this.container);
				child.setIsToplevel(true);

				if (!child.isHidden()) {
					shownWidgetWidth += child.getButtonWidth();
				}
			}

			overflowWidgetsWidth = 0;
			updatedChildren = true;
		}

		if (shownWidgetWidth >= availableWidth) {
			// Move widgets to the overflow menu.

			// Start with the rightmost widget, move to the leftmost
			for (
				let i = this.widgetList.length - 1;
				i >= 0 && shownWidgetWidth >= availableWidth;
				i--
			) {
				const child = this.widgetList[i];

				if (this.overflowWidget.hasAsChild(child)) {
					continue;
				}

				if (child.canBeInOverflowMenu()) {
					shownWidgetWidth -= child.getButtonWidth();
					this.overflowWidget.addToOverflow(child);
				}
			}

			updatedChildren = true;
		}

		// Hide/show the overflow widget.
		this.overflowWidget.setHidden(this.overflowWidget.getChildWidgets().length === 0);

		if (updatedChildren) {
			this.setupColorPickers();
		}
	}


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
		const id = widget.getUniqueIdIn(this.widgetsById);

		// Add the widget
		this.widgetsById[id] = widget;
		this.widgetList.push(widget);

		// Add HTML elements.
		const container = widget.addTo(this.container);
		this.setupColorPickers();

		// Ensure that the widget gets displayed in the correct
		// place in the toolbar, even if it's removed and re-added.
		container.style.order = `${this.widgetOrderCounter++}`;

		this.queueReLayout();
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
	public addSpacer(options: Partial<SpacerOptions> = {}) {
		const spacer = document.createElement('div');
		spacer.classList.add(`${toolbarCSSPrefix}spacer`);

		if (options.grow) {
			spacer.style.flexGrow = `${options.grow}`;
		}

		if (options.minSize) {
			spacer.style.minWidth = options.minSize;
		}

		if (options.maxSize) {
			spacer.style.maxWidth = options.maxSize;
		}

		spacer.style.order = `${this.widgetOrderCounter++}`;
		this.container.appendChild(spacer);
	}

	public serializeState(): string {
		const result: Record<string, any> = {};

		for (const widgetId in this.widgetsById) {
			result[widgetId] = this.widgetsById[widgetId].serializeState();
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
			if (!(widgetId in this.widgetsById)) {
				console.warn(`Unable to deserialize widget ${widgetId} ­— no such widget.`);
			}

			this.widgetsById[widgetId].deserializeFrom(data[widgetId]);
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
	 * Adds a widget that toggles the overflow menu. Call `addOverflowWidget` to ensure
	 * that this widget is in the correct space (if shown).
	 *
	 * @example
	 * ```ts
	 * toolbar.addDefaultToolWidgets();
	 * toolbar.addOverflowWidget();
	 * toolbar.addDefaultActionButtons();
	 * ```
	 * shows the overflow widget between the default tool widgets and the default action buttons,
	 * if shown.
	 */
	public addOverflowWidget() {
		this.overflowWidget = new OverflowWidget(this.editor, this.localizationTable);
		this.addWidget(this.overflowWidget);
	}

	/**
	 * Adds both the default tool widgets and action buttons. Equivalent to
	 * ```ts
	 * toolbar.addDefaultToolWidgets();
	 * toolbar.addOverflowWidget();
	 * toolbar.addDefaultActionButtons();
	 * ```
	 */
	public addDefaults() {
		this.addDefaultToolWidgets();
		this.addOverflowWidget();
		this.addDefaultActionButtons();
	}

	public remove() {
		this.container.remove();
		this.resizeObserver.disconnect();
		this.closeColorPickerOverlay?.remove();

		for (const listener of this.listeners) {
			listener.remove();
		}
	}
}
