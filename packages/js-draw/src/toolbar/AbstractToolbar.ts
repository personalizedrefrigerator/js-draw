import Editor from '../Editor';
import { EditorEventType } from '../types';

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
import BaseWidget, { ToolbarWidgetTag } from './widgets/BaseWidget';
import ActionButtonWidget from './widgets/ActionButtonWidget';
import InsertImageWidget from './widgets/InsertImageWidget';
import DocumentPropertiesWidget from './widgets/DocumentPropertiesWidget';
import { DispatcherEventListener } from '../EventDispatcher';
import { Color4 } from '@js-draw/math';
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

		// Hide the color picker when attempting to draw on the overlay.
		this.#listeners.push(this.editor.handlePointerEventsExceptClicksFrom(this.closeColorPickerOverlay, (eventName) => {
			if (eventName === 'pointerdown') {
				closeColoris();
			}

			// Transfer focus to the editor to allow keyboard events to be handled.
			if (eventName === 'pointerup') {
				this.editor.focus();
			}

			// Send the event to the editor
			return true;
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

				swatches,
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

	protected closeColorPickers() {
		closeColoris();
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

	private static rootToolbarId = 'root-toolbar--';

	/** Returns a snapshot of the state of widgets in the toolbar. */
	public serializeState(): string {
		const result: Record<string, any> = {};

		for (const widgetId in this.#widgetsById) {
			result[widgetId] = this.#widgetsById[widgetId].serializeState();
		}

		result[AbstractToolbar.rootToolbarId] = this.serializeInternal();

		return JSON.stringify(result);
	}

	/**
	 * Deserialize toolbar widgets from the given state.
	 * Assumes that toolbar widgets are in the same order as when state was serialized.
	 */
	public deserializeState(state: string) {
		const data = JSON.parse(state);

		const rootId = AbstractToolbar.rootToolbarId;
		this.deserializeInternal(data[rootId]);

		for (const widgetId in data) {
			if (widgetId === rootId) {
				continue;
			}

			if (!(widgetId in this.#widgetsById)) {
				console.warn(`Unable to deserialize widget ${widgetId} ­— no such widget.`);
				continue;
			}

			this.#widgetsById[widgetId].deserializeFrom(data[widgetId]);
		}
	}

	/**
	 * Called by `serializeState` to attach any additional JSONifyable data
	 * to the serialized result.
	 *
	 * @reutrns an object that can be converted to JSON with `JSON.stringify`.
	 */
	protected serializeInternal(): any {}

	/**
	 * Called by `deserializeState` with a version of the JSON outputted
	 * previously by `serializeInternal`.
	 */
	protected deserializeInternal(_json: any) {}

	/**
	 * Creates, but does not add, an action button to this container.
	 *
	 * @see
	 * {@link addActionButton}
	 */
	protected makeActionButton(
		title: string|ActionButtonIcon,
		command: ()=>void,
		mustBeToplevel: boolean = true,
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

		return widget;
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
		const widget = this.makeActionButton(title, command, mustBeToplevel);
		this.addWidget(widget);
		return widget;
	}

	/**
	 * Like {@link addActionButton}, except associates `tags` with the button that allow
	 * different toolbar styles to give the button tag-dependent styles.
	 */
	public addTaggedActionButton(
		tags: (ToolbarWidgetTag|string)[],
		title: string|ActionButtonIcon,
		command: ()=>void,
		mustBeToplevel = true
	): BaseWidget {
		const widget = this.makeActionButton(title, command, mustBeToplevel);
		widget.setTags(tags);
		this.addWidget(widget);

		return widget;
	}

	public addUndoRedoButtons(undoFirst = true) {
		const makeUndo = () => {
			return this.addTaggedActionButton([
				ToolbarWidgetTag.Undo,
			], {
				label: this.localizationTable.undo,
				icon: this.editor.icons.makeUndoIcon()
			}, () => {
				this.editor.history.undo();
			});
		};
		const makeRedo = () => {
			return this.addTaggedActionButton([
				ToolbarWidgetTag.Redo,
			], {
				label: this.localizationTable.redo,
				icon: this.editor.icons.makeRedoIcon(),
			}, () => {
				this.editor.history.redo();
			});
		};

		let undoButton: BaseWidget;
		let redoButton: BaseWidget;
		if (undoFirst) {
			undoButton = makeUndo();
			redoButton = makeRedo();
		} else {
			redoButton = makeRedo();
			undoButton = makeUndo();
		}

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

	/**
	 * Adds toolbar widgets based on the enabled tools.
	 */
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

		this.addWidget(new DocumentPropertiesWidget(this.editor, this.localizationTable));
		this.addWidget(new InsertImageWidget(this.editor, this.localizationTable));
	}

	public addDefaultActionButtons() {
		this.addUndoRedoButtons();
	}

	/**
	 * Adds both the default tool widgets and action buttons.
	 */
	public abstract addDefaults(): void;

	/** Remove this toolbar from its container and clean up listeners. */
	public remove() {
		this.closeColorPickerOverlay?.remove();

		for (const listener of this.#listeners) {
			listener.remove();
		}
		this.#listeners = [];

		this.onRemove();
	}

	/**
	 * Removes `listener` when {@link remove} is called.
	 */
	protected manageListener(listener: DispatcherEventListener) {
		this.#listeners.push(listener);
	}

	/**
	 * Internal logic for {@link remove}. Implementers should remove the toolbar
	 * from its container.
	 */
	protected abstract onRemove(): void;
}
