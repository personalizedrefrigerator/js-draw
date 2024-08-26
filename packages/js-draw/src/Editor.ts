import EditorImage from './image/EditorImage';
import ToolController from './tools/ToolController';
import { EditorNotifier, EditorEventType, ImageLoader } from './types';
import { HTMLPointerEventName, HTMLPointerEventFilter, InputEvtType, PointerEvt, keyUpEventFromHTMLEvent, keyPressEventFromHTMLEvent, PointerEvtType } from './inputEvents';
import Command from './commands/Command';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from './EventDispatcher';
import { Point2, Vec2, Vec3, Color4, Mat33, Rect2 } from '@js-draw/math';
import Display, { RenderingMode } from './rendering/Display';
import SVGLoader from './SVGLoader/SVGLoader';
import Pointer from './Pointer';
import { EditorLocalization } from './localization';
import getLocalizationTable from './localizations/getLocalizationTable';
import IconProvider from './toolbar/IconProvider';
import CanvasRenderer from './rendering/renderers/CanvasRenderer';
import untilNextAnimationFrame from './util/untilNextAnimationFrame';
import uniteCommands from './commands/uniteCommands';
import SelectionTool from './tools/SelectionTool/SelectionTool';
import AbstractComponent from './components/AbstractComponent';
import Erase from './commands/Erase';
import BackgroundComponent, { BackgroundType } from './components/BackgroundComponent';
import sendPenEvent from './testing/sendPenEvent';
import KeyboardShortcutManager from './shortcuts/KeyboardShortcutManager';
import KeyBinding from './shortcuts/KeyBinding';
import AbstractToolbar from './toolbar/AbstractToolbar';
import EdgeToolbar from './toolbar/EdgeToolbar';
import StrokeKeyboardControl from './tools/InputFilter/StrokeKeyboardControl';
import guessKeyCodeFromKey from './util/guessKeyCodeFromKey';
import RenderablePathSpec from './rendering/RenderablePathSpec';
import makeAboutDialog, { AboutDialogEntry } from './dialogs/makeAboutDialog';
import version from './version';
import { editorImageToSVGSync, editorImageToSVGAsync } from './image/export/editorImageToSVG';
import ReactiveValue, { MutableReactiveValue } from './util/ReactiveValue';
import listenForKeyboardEventsFrom from './util/listenForKeyboardEventsFrom';
import mitLicenseAttribution from './util/mitLicenseAttribution';
import { PenTypeRecord } from './toolbar/widgets/PenToolWidget';
import ClipboardHandler from './util/ClipboardHandler';
import { ShowCustomFilePickerCallback } from './toolbar/widgets/components/makeFileInput';
import ContextMenuRecognizer from './tools/InputFilter/ContextMenuRecognizer';

/**
 * Provides settings to an instance of an editor. See the Editor {@link Editor.constructor}.
 *
 * ## Example
 *
 * [[include:doc-pages/inline-examples/settings-example-1.md]]
 */
export interface EditorSettings {
	/** Defaults to `RenderingMode.CanvasRenderer` */
	renderingMode: RenderingMode,

	/** Uses a default English localization if a translation is not given. */
	localization: Partial<EditorLocalization>,

	/**
	 * `true` if touchpad/mousewheel scrolling should scroll the editor instead of the document.
	 * This does not include pinch-zoom events.
	 * Defaults to true.
	 */
	wheelEventsEnabled: boolean|'only-if-focused';

	/** Minimum zoom fraction (e.g. 0.5 → 50% zoom). Defaults to $2 \cdot 10^{-10}$. */
	minZoom: number,

	/** Maximum zoom fraction (e.g. 2 → 200% zoom). Defaults to $1 \cdot 10^{12}$. */
	maxZoom: number,

	/**
	 * Overrides for keyboard shortcuts. For example,
	 * ```ts
	 * {
	 * 	'some.shortcut.id': [ KeyBinding.keyboardShortcutFromString('ctrl+a') ],
	 * 	'another.shortcut.id': [ ]
	 * }
	 * ```
	 * where shortcut IDs map to lists of associated keybindings.
	 *
	 * @see
	 * - {@link KeyBinding}
	 * - {@link KeyboardShortcutManager}
	 */
	keyboardShortcutOverrides: Record<string, Array<KeyBinding>>,

	/**
	 * Provides a set of icons for the editor.
	 *
	 * See, for example, the `@js-draw/material-icons` package.
	 */
	iconProvider: IconProvider,

	/**
	 * Additional messages to show in the "about" dialog.
	 */
	notices: AboutDialogEntry[],

	/**
	 * Information about the app/website js-draw is running within. This is shown
	 * at the beginning of the about dialog.
	 */
	appInfo: {
		name: string,

		// (Optional) A brief description of the app
		description?: string;

		// (Optional) The app version
		version?: string,
	}|null,

	/**
	 * Configures the default {@link PenTool} tools.
	 *
	 * **Example**:
	 * [[include:doc-pages/inline-examples/editor-settings-polyline-pen.md]]
	 */
	pens: {
		/**
		 * Additional pen types that can be selected in a toolbar.
		 */
		additionalPenTypes?: readonly Readonly<PenTypeRecord>[],

		/**
		 * Should return `true` if a pen type should be shown in the toolbar.
		 *
		 * @example
		 * ```ts,runnable
		 * import {Editor} from 'js-draw';
		 * const editor = new Editor(document.body, {
		 *   // Only allow selecting the polyline pen from the toolbar.
		 *   pens: { filterPenTypes: p => p.id === 'polyline-pen' },
		 * });
		 * editor.addToolbar();
		 * ```
		 * Notice that this setting only affects the toolbar GUI.
		 */
		filterPenTypes?: (penType: PenTypeRecord)=>boolean,
	}|null,

	/** Configures the default {@link TextTool} control and text tool. */
	text: {
		/** Fonts to show in the text UI. */
		fonts?: string[],
	}|null,

	/** Configures the default {@link InsertImageWidget} control. */
	image: {
		/**
		 * A custom callback to show an image picker. If given, this should return
		 * a list of `File`s representing the images selected by the picker.
		 *
		 * If not given, the default file picker shown by a [file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file)
		 * is shown.
		 *
		 * @beta -- API may change between minor releases.
		 */
		showImagePicker?: ShowCustomFilePickerCallback;
	}|null,
}

/**
 * The main entrypoint for the full editor.
 *
 * ## Example
 * To create an editor with a toolbar,
 * ```ts,runnable
 * import { Editor } from 'js-draw';
 *
 * const editor = new Editor(document.body);
 *
 * const toolbar = editor.addToolbar();
 * toolbar.addSaveButton(() => {
 *   const saveData = editor.toSVG().outerHTML;
 *   // Do something with saveData...
 * });
 * ```
 *
 * See also
 * * [`examples.md`](https://github.com/personalizedrefrigerator/js-draw/blob/main/docs/examples.md).
 */
export class Editor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private renderingRegion: HTMLElement;

	/** Manages drawing surfaces/{@link AbstractRenderer}s. */
	public display: Display;

	/**
	 * Handles undo/redo.
	 *
	 * @example
	 * ```
	 * const editor = new Editor(document.body);
	 *
	 * // Do something undoable.
	 * // ...
	 *
	 * // Undo the last action
	 * editor.history.undo();
	 * ```
	 */
	public history: UndoRedoHistory;

	/**
	 * Data structure for adding/removing/querying objects in the image.
	 *
	 * @example
	 * ```ts,runnable
	 * import { Editor, Stroke, Path, Color4, pathToRenderable } from 'js-draw';
	 * const editor = new Editor(document.body);
	 *
	 * // Create a path.
	 * const stroke = new Stroke([
	 *   pathToRenderable(Path.fromString('M0,0 L100,100 L300,30 z'), { fill: Color4.red }),
	 * ]);
	 * const addElementCommand = editor.image.addElement(stroke);
	 *
	 * // Add the stroke to the editor
	 * editor.dispatch(addElementCommand);
	 * ```
	 */
	public readonly image: EditorImage;

	/**
	 * Allows transforming the view and querying information about
	 * what is currently visible.
	 */
	public readonly viewport: Viewport;

	/** @internal */
	public readonly localization: EditorLocalization;

	/** {@link EditorSettings.iconProvider} */
	public readonly icons: IconProvider;

	/**
	 * Manages and allows overriding of keyboard shortcuts.
	 *
	 * @internal
	 */
	public readonly shortcuts: KeyboardShortcutManager;

	/**
	 * Controls the list of tools. See
	 * [the custom tool example](https://github.com/personalizedrefrigerator/js-draw/tree/main/docs/examples/example-custom-tools)
	 * for more.
	 */
	public readonly toolController: ToolController;

	/**
	 * Global event dispatcher/subscriber.
	 *
	 * @example
	 *
	 * ```ts,runnable
	 * import { Editor, EditorEventType, SerializableCommand } from 'js-draw';
	 *
	 * // Create a minimal editor
	 * const editor = new Editor(document.body);
	 * editor.addToolbar();
	 *
	 * // Create a place to show text output
	 * const log = document.createElement('textarea');
	 * document.body.appendChild(log);
	 * log.style.width = '100%';
	 * log.style.height = '200px';
	 *
	 * // Listen for CommandDone events (there's also a CommandUndone)
	 * editor.notifier.on(EditorEventType.CommandDone, event => {
	 *   // Type narrowing for TypeScript -- event will always be of kind CommandDone,
	 *   // but TypeScript doesn't know this.
	 *   if (event.kind !== EditorEventType.CommandDone) return;
	 *
	 *   log.value = `Command done ${event.command.description(editor, editor.localization)}\n`;
	 *
	 *   if (event.command instanceof SerializableCommand) {
	 *     log.value += `serializes to: ${JSON.stringify(event.command.serialize())}`;
	 *   }
	 * });
	 *
	 * // Dispatch an initial command to trigger the event listener for the first time
	 * editor.dispatch(editor.image.setAutoresizeEnabled(true));
	 * ```
	 */
	public readonly notifier: EditorNotifier;

	private loadingWarning: HTMLElement;
	private accessibilityAnnounceArea: HTMLElement;
	private accessibilityControlArea: HTMLTextAreaElement;
	private eventListenerTargets: HTMLElement[] = [];
	private readOnly: MutableReactiveValue<boolean>;

	private readonly settings: Readonly<EditorSettings>;

	/**
	 * @example
	 * ```ts,runnable
	 * import { Editor } from 'js-draw';
	 *
	 * const container = document.body;
	 *
	 * // Create an editor
	 * const editor = new Editor(container, {
	 *   // 2e-10 and 1e12 are the default values for minimum/maximum zoom.
	 *   minZoom: 2e-10,
	 *   maxZoom: 1e12,
	 * });
	 *
	 * // Add the default toolbar
	 * const toolbar = editor.addToolbar();
	 *
	 * const createCustomIcon = () => {
	 *   // Create/return an icon here.
	 * };
	 *
	 * // Add a custom button
	 * toolbar.addActionButton({
	 *   label: 'Custom Button'
	 *   icon: createCustomIcon(),
	 * }, () => {
	 *   // Do something here
	 * });
	 * ```
	 */
	public constructor(
		parent: HTMLElement,
		settings: Partial<EditorSettings> = {},
	) {
		this.localization = {
			...getLocalizationTable(),
			...settings.localization,
		};

		// Fill default settings.
		this.settings = {
			wheelEventsEnabled: settings.wheelEventsEnabled ?? true,
			renderingMode: settings.renderingMode ?? RenderingMode.CanvasRenderer,
			localization: this.localization,
			minZoom: settings.minZoom ?? 2e-10,
			maxZoom: settings.maxZoom ?? 1e12,
			keyboardShortcutOverrides: settings.keyboardShortcutOverrides ?? {},
			iconProvider: settings.iconProvider ?? new IconProvider(),
			notices: [],
			appInfo: settings.appInfo ? { ...settings.appInfo } : null,
			pens: {
				additionalPenTypes: settings.pens?.additionalPenTypes ?? [],
				filterPenTypes: settings.pens?.filterPenTypes ?? (()=>true)
			},
			text: {
				fonts: settings.text?.fonts ?? [ 'sans-serif', 'serif', 'monospace' ],
			},
			image: {
				showImagePicker: settings.image?.showImagePicker ?? undefined,
			},
		};

		// Validate settings
		if (this.settings.minZoom > this.settings.maxZoom) {
			throw new Error('Minimum zoom must be lesser than maximum zoom!');
		}

		this.readOnly = MutableReactiveValue.fromInitialValue(false);

		this.icons = this.settings.iconProvider;

		this.shortcuts = new KeyboardShortcutManager(this.settings.keyboardShortcutOverrides);

		this.container = document.createElement('div');
		this.renderingRegion = document.createElement('div');
		this.container.appendChild(this.renderingRegion);
		this.container.classList.add('imageEditorContainer', 'js-draw');

		this.loadingWarning = document.createElement('div');
		this.loadingWarning.classList.add('loadingMessage');
		this.loadingWarning.ariaLive = 'polite';
		this.container.appendChild(this.loadingWarning);

		this.accessibilityControlArea = document.createElement('textarea');
		this.accessibilityControlArea.setAttribute('placeholder', this.localization.accessibilityInputInstructions);
		this.accessibilityControlArea.style.opacity = '0';
		this.accessibilityControlArea.style.width = '0';
		this.accessibilityControlArea.style.height = '0';
		this.accessibilityControlArea.style.position = 'absolute';

		this.accessibilityAnnounceArea = document.createElement('div');
		this.accessibilityAnnounceArea.setAttribute('aria-live', 'assertive');
		this.accessibilityAnnounceArea.className = 'accessibilityAnnouncement';
		this.container.appendChild(this.accessibilityAnnounceArea);

		this.renderingRegion.style.touchAction = 'none';
		this.renderingRegion.className = 'imageEditorRenderArea';
		this.renderingRegion.appendChild(this.accessibilityControlArea);
		this.renderingRegion.setAttribute('tabIndex', '0');
		this.renderingRegion.setAttribute('alt', '');

		this.notifier = new EventDispatcher();
		this.viewport = new Viewport((oldTransform, newTransform) => {
			this.notifier.dispatch(EditorEventType.ViewportChanged, {
				kind: EditorEventType.ViewportChanged,
				newTransform,
				oldTransform,
			});
		});
		this.display = new Display(this, this.settings.renderingMode, this.renderingRegion);
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this, this.announceRedoCallback, this.announceUndoCallback);
		this.toolController = new ToolController(this, this.localization);

		// TODO: Make this pipeline configurable (e.g. allow users to add global input stabilization)
		this.toolController.addInputMapper(StrokeKeyboardControl.fromEditor(this));
		this.toolController.addInputMapper(new ContextMenuRecognizer());

		parent.appendChild(this.container);

		this.viewport.updateScreenSize(
			Vec2.of(this.display.width, this.display.height)
		);

		this.registerListeners();
		this.queueRerender();
		this.hideLoadingWarning();


		// Enforce zoom limits.
		this.notifier.on(EditorEventType.ViewportChanged, evt => {
			if (evt.kind !== EditorEventType.ViewportChanged) return;

			const getZoom = (mat: Mat33) => mat.transformVec3(Vec2.unitX).length();

			const zoom = getZoom(evt.newTransform);
			if (zoom > this.settings.maxZoom || zoom < this.settings.minZoom) {
				const oldZoom = getZoom(evt.oldTransform);
				let resetTransform = Mat33.identity;

				if (oldZoom <= this.settings.maxZoom && oldZoom >= this.settings.minZoom) {
					resetTransform = evt.oldTransform;
				} else {
					// If 1x zoom isn't acceptable, try a zoom between the minimum and maximum.
					resetTransform = Mat33.scaling2D(
						(this.settings.minZoom + this.settings.maxZoom) / 2
					);
				}

				this.viewport.resetTransform(resetTransform);
			}
			else if (!isFinite(zoom)) {
				// Recover from possible division-by-zero
				console.warn(
					`Non-finite zoom (${zoom}) detected. Resetting the viewport. This was likely caused by division by zero.`
				);
				if (isFinite(getZoom(evt.oldTransform))) {
					this.viewport.resetTransform(evt.oldTransform);
				} else {
					this.viewport.resetTransform();
				}
			}
		});
	}

	/**
	 * @returns a shallow copy of the current settings of the editor.
	 *
	 * Do not modify.
	 */
	public getCurrentSettings(): Readonly<EditorSettings> {
		return {
			...this.settings,
		};
	}

	/**
	 * @returns a reference to the editor's container.
	 *
	 * @example
	 * ```
	 *   // Set the editor's height to 500px
	 *   editor.getRootElement().style.height = '500px';
	 * ```
	 */
	public getRootElement(): HTMLElement {
		return this.container;
	}

	/**
	 * Shows a "Loading..." message.
	 * @param fractionLoaded - should be a number from 0 to 1, where 1 represents completely loaded.
	 */
	public showLoadingWarning(fractionLoaded: number) {
		const loadingPercent = Math.round(fractionLoaded * 100);
		this.loadingWarning.innerText = this.localization.loading(loadingPercent);
		this.loadingWarning.style.display = 'block';
	}

	/** @see {@link showLoadingWarning} */
	public hideLoadingWarning() {
		this.loadingWarning.style.display = 'none';
		this.announceForAccessibility(this.localization.doneLoading);
	}

	private previousAccessibilityAnnouncement: string = '';

	/**
	 * Announce `message` for screen readers. If `message` is the same as the previous
	 * message, it is re-announced.
	 */
	public announceForAccessibility(message: string) {
		// Force re-announcing an announcement if announced again.
		if (message === this.previousAccessibilityAnnouncement) {
			message = message + '. ';
		}
		this.accessibilityAnnounceArea.innerText = message;
		this.previousAccessibilityAnnouncement = message;
	}

	/**
	 * Creates a toolbar. If `defaultLayout` is true, default buttons are used.
	 * @returns a reference to the toolbar.
	 */
	public addToolbar(defaultLayout: boolean = true): AbstractToolbar {
		const toolbar = new EdgeToolbar(this, this.container, this.localization);

		if (defaultLayout) {
			toolbar.addDefaults();
		}

		return toolbar;
	}

	private registerListeners() {
		this.handlePointerEventsFrom(this.renderingRegion);
		this.handleKeyEventsFrom(this.renderingRegion);
		this.handlePointerEventsFrom(this.accessibilityAnnounceArea);

		// Prevent selected text from control areas from being dragged.
		// See https://github.com/personalizedrefrigerator/joplin-plugin-freehand-drawing/issues/8
		const preventSelectionOf = [
			this.renderingRegion,
			this.accessibilityAnnounceArea,
			this.accessibilityControlArea,
			this.loadingWarning,
		];
		for (const element of preventSelectionOf) {
			element.addEventListener('drag', event => {
				event.preventDefault();
				return false;
			});

			element.addEventListener('dragstart', event => {
				event.preventDefault();
				return false;
			});
		}

		this.container.addEventListener('wheel', evt => {
			this.handleHTMLWheelEvent(evt);
		});

		const handleResize = () => {
			this.viewport.updateScreenSize(
				Vec2.of(this.display.width, this.display.height)
			);
			this.rerender();
			this.updateEditorSizeVariables();
		};

		if ('ResizeObserver' in (window as any)) {
			const resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(this.renderingRegion);
			resizeObserver.observe(this.container);
		} else {
			addEventListener('resize', handleResize);
		}

		this.accessibilityControlArea.addEventListener('input', () => {
			this.accessibilityControlArea.value = '';
		});

		const copyHandler = new ClipboardHandler(this);

		document.addEventListener('copy', async evt => {
			if (!this.isEventSink(document.querySelector(':focus'))) {
				return;
			}

			copyHandler.copy(evt);
		});

		document.addEventListener('paste', evt => {
			this.handlePaste(evt);
		});
	}

	private updateEditorSizeVariables() {
		// Add CSS variables so that absolutely-positioned children of the editor can
		// still fill the screen.
		this.container.style.setProperty(
			'--editor-current-width-px', `${this.container.clientWidth}px`
		);
		this.container.style.setProperty(
			'--editor-current-height-px', `${this.container.clientHeight}px`
		);
		this.container.style.setProperty(
			'--editor-current-display-width-px', `${this.renderingRegion.clientWidth}px`
		);
		this.container.style.setProperty(
			'--editor-current-display-height-px', `${this.renderingRegion.clientHeight}px`
		);
	}

	/** @internal */
	public handleHTMLWheelEvent(event: WheelEvent) {
		let delta = Vec3.of(event.deltaX, event.deltaY, event.deltaZ);

		// Process wheel events if the ctrl key is down, even if disabled -- we do want to handle
		// pinch-zooming.
		if (!event.ctrlKey && !event.metaKey) {
			if (!this.settings.wheelEventsEnabled) {
				return;
			} else if (this.settings.wheelEventsEnabled === 'only-if-focused') {
				const focusedChild = this.container.querySelector(':focus');

				if (!focusedChild) {
					return;
				}
			}
		}

		if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
			delta = delta.times(15);
		} else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
			delta = delta.times(100);
		}

		if (event.ctrlKey || event.metaKey) {
			delta = Vec3.of(0, 0, event.deltaY);
		}

		// Ensure that `pos` is relative to `this.renderingRegion`
		const bbox = this.renderingRegion.getBoundingClientRect();
		const pos = Vec2.of(event.clientX, event.clientY).minus(Vec2.of(bbox.left, bbox.top));

		if (this.toolController.dispatchInputEvent({
			kind: InputEvtType.WheelEvt,
			delta,
			screenPos: pos,
		})) {
			event.preventDefault();
			return true;
		}
		return false;
	}

	private pointers: Record<number, Pointer> = {};
	private getPointerList() {
		const nowTime = performance.now();

		const res: Pointer[] = [];
		for (const id in this.pointers) {
			const maxUnupdatedTime = 2000; // Maximum time without a pointer update (ms)
			if (this.pointers[id] && (nowTime - this.pointers[id].timeStamp) < maxUnupdatedTime) {
				res.push(this.pointers[id]);
			}
		}
		return res;
	}

	/**
	 * A protected method that can override setPointerCapture in environments where it may fail
	 * (e.g. with synthetic events). @internal
	 */
	protected setPointerCapture(target: HTMLElement, pointerId: number) {
		try {
			target.setPointerCapture(pointerId);
		} catch (error) {
			console.warn('Failed to setPointerCapture', error);
		}
	}

	/** Can be overridden in a testing environment to handle synthetic events. @internal */
	protected releasePointerCapture(target: HTMLElement, pointerId: number) {
		try {
			target.releasePointerCapture(pointerId);
		} catch (error) {
			console.warn('Failed to releasePointerCapture', error);
		}
	}

	/**
	 * Dispatches a `PointerEvent` to the editor. The target element for `evt` must have the same top left
	 * as the content of the editor.
	 */
	public handleHTMLPointerEvent(eventType: 'pointerdown'|'pointermove'|'pointerup'|'pointercancel', evt: PointerEvent): boolean {
		const eventsRelativeTo = this.renderingRegion;
		const eventTarget = (evt.target as HTMLElement|null) ?? this.renderingRegion;

		if (eventType === 'pointerdown') {
			const pointer = Pointer.ofEvent(evt, true, this.viewport, eventsRelativeTo);
			this.pointers[pointer.id] = pointer;

			this.setPointerCapture(eventTarget, pointer.id);
			const event: PointerEvt = {
				kind: InputEvtType.PointerDownEvt,
				current: pointer,
				allPointers: this.getPointerList(),
			};
			this.toolController.dispatchInputEvent(event);

			return true;
		}
		else if (eventType === 'pointermove') {
			const pointer = Pointer.ofEvent(
				evt, this.pointers[evt.pointerId]?.down ?? false, this.viewport, eventsRelativeTo
			);
			if (pointer.down) {
				const prevData = this.pointers[pointer.id];

				if (prevData) {
					const distanceMoved = pointer.screenPos.distanceTo(prevData.screenPos);

					// If the pointer moved less than two pixels, don't send a new event.
					if (distanceMoved < 2) {
						return false;
					}
				}

				this.pointers[pointer.id] = pointer;
				if (this.toolController.dispatchInputEvent({
					kind: InputEvtType.PointerMoveEvt,
					current: pointer,
					allPointers: this.getPointerList(),
				})) {
					evt.preventDefault();
				}
			}
			return true;
		}
		else if (eventType === 'pointercancel' || eventType === 'pointerup') {
			const pointer = Pointer.ofEvent(evt, false, this.viewport, eventsRelativeTo);
			if (!this.pointers[pointer.id]) {
				return false;
			}

			console.log('pointerup');

			this.pointers[pointer.id] = pointer;
			this.releasePointerCapture(eventTarget, pointer.id);
			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.PointerUpEvt,
				current: pointer,
				allPointers: this.getPointerList(),
			})) {
				evt.preventDefault();
			}
			delete this.pointers[pointer.id];
			return true;
		}

		return eventType;
	}

	private isEventSink(evtTarget: Element|EventTarget|null) {
		let currentElem: Element|null = evtTarget as Element|null;
		while (currentElem !== null) {
			for (const elem of this.eventListenerTargets) {
				if (elem === currentElem) {
					return true;
				}
			}

			currentElem = currentElem.parentElement;
		}
		return false;
	}

	/** @internal */
	protected async handleDrop(evt: DragEvent|ClipboardEvent) {
		evt.preventDefault();
		this.handlePaste(evt);
	}

	/** @internal */
	protected async handlePaste(evt: DragEvent|ClipboardEvent) {
		const target = document.querySelector(':focus') ?? evt.target;
		if (!this.isEventSink(target)) {
			return;
		}

		return await new ClipboardHandler(this).paste(evt);
	}

	/**
	 * Forward pointer events from `elem` to this editor. Such that right-click/right-click drag
	 * events are also forwarded, `elem`'s contextmenu is disabled.
	 *
	 * `filter` is called once per pointer event, before doing any other processing. If `filter` returns `true` the event is
	 * forwarded to the editor.
	 *
	 * **Note**: `otherEventsFilter` is like `filter`, but is called for other pointer-related
	 * events that could also be forwarded to the editor. To forward just pointer events,
	 * for example, `otherEventsFilter` could be given as `()=>false`.
	 *
	 * @example
	 * ```ts
	 * const overlay = document.createElement('div');
	 * editor.createHTMLOverlay(overlay);
	 *
	 * // Send all pointer events that don't have the control key pressed
	 * // to the editor.
	 * editor.handlePointerEventsFrom(overlay, (event) => {
	 *   if (event.ctrlKey) {
	 *     return false;
	 *   }
	 *   return true;
	 * });
	 * ```
	 */
	public handlePointerEventsFrom(
		elem: HTMLElement,
		filter?: HTMLPointerEventFilter,
		otherEventsFilter?: (eventName: string, event: Event)=>boolean,
	) {
		// May be required to prevent text selection on iOS/Safari:
		// See https://stackoverflow.com/a/70992717/17055750
		const touchstartListener = (evt: Event) => {
			if (otherEventsFilter && !otherEventsFilter('touchstart', evt)) {
				return;
			}

			evt.preventDefault();
		};
		const contextmenuListener = (evt: Event) => {
			if (otherEventsFilter && !otherEventsFilter('contextmenu', evt)) {
				return;
			}

			// Don't show a context menu
			evt.preventDefault();
		};

		const listeners: Record<string, (event: Event)=>void> = {
			'touchstart': touchstartListener,
			'contextmenu': contextmenuListener,
		};

		const eventNames: HTMLPointerEventName[] = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
		for (const eventName of eventNames) {
			listeners[eventName] = (evt: Event) => {
				// This listener will only be called in the context of PointerEvents.
				const event = evt as PointerEvent;

				if (filter && !filter(eventName, event)) {
					return undefined;
				}

				return this.handleHTMLPointerEvent(eventName, event);
			};
		}

		// Add all listeners.
		for (const eventName in listeners) {
			elem.addEventListener(eventName, listeners[eventName]);
		}

		return {
			/** Remove all event listeners registered by this function. */
			remove: () => {
				for (const eventName in listeners) {
					elem.removeEventListener(eventName, listeners[eventName]);
				}
			},
		};
	}

	/**
	 * Like {@link handlePointerEventsFrom} except ignores short input gestures like clicks.
	 *
	 * `filter` is called once per event, before doing any other processing. If `filter` returns `true` the event is
	 * forwarded to the editor.
	 *
	 * `otherEventsFilter` is passed unmodified to `handlePointerEventsFrom`.
	 */
	public handlePointerEventsExceptClicksFrom(
		elem: HTMLElement,
		filter?: HTMLPointerEventFilter,
		otherEventsFilter?: (eventName: string, event: Event)=>boolean,
	) {
		type GestureRecord = {
			// Buffer events: Send events to the editor only if the pointer has moved enough to
			// suggest that the user is attempting to draw, rather than click to close the color picker.
			eventBuffer: [ HTMLPointerEventName, PointerEvent ][];
			hasMovedSignificantly: boolean;
			startPoint: Point2;
		};

		// Maps pointer IDs to gesture start points
		const gestureData: Record<number, GestureRecord> = Object.create(null);

		return this.handlePointerEventsFrom(elem, (eventName, event) => {
			if (filter && !filter(eventName, event)) {
				return false;
			}

			// Position of the current event.
			// jsdom doesn't seem to support pageX/pageY -- use clientX/clientY if unavailable
			const currentPos = Vec2.of(
				event.pageX ?? event.clientX, event.pageY ?? event.clientY
			);

			const pointerId = event.pointerId ?? 0;

			// Whether to send the current event to the editor
			let sendToEditor = true;

			if (eventName === 'pointerdown') {
				// Buffer the event, but don't send it to the editor yet.
				// We don't want to send single-click events, but we do want to send full strokes.
				gestureData[pointerId] = {
					eventBuffer: [ [eventName, event] ],
					startPoint: currentPos,
					hasMovedSignificantly: false,
				};

				// Capture the pointer so we receive future events even if the overlay is hidden.
				this.setPointerCapture(elem, event.pointerId);

				// Don't send to the editor.
				sendToEditor = false;
			}
			else if (eventName === 'pointermove' && gestureData[pointerId]) {
				const gestureStartPos = gestureData[pointerId].startPoint;
				const eventBuffer = gestureData[pointerId].eventBuffer;

				// Skip if the pointer hasn't moved enough to not be a "click".
				const strokeStartThreshold = 10;
				const isWithinClickThreshold = gestureStartPos && currentPos.distanceTo(gestureStartPos) < strokeStartThreshold;
				if (isWithinClickThreshold && !gestureData[pointerId].hasMovedSignificantly) {
					eventBuffer.push([ eventName, event ]);
					sendToEditor = false;
				} else {
					// Send all buffered events to the editor -- start the stroke.
					for (const [ eventName, event ] of eventBuffer) {
						this.handleHTMLPointerEvent(eventName, event);
					}

					gestureData[pointerId].eventBuffer = [];
					gestureData[pointerId].hasMovedSignificantly = true;
					sendToEditor = true;
				}
			}
			// Pointers that aren't down -- send to the editor.
			else if (eventName === 'pointermove') {
				sendToEditor = true;
			}
			// Otherwise, if we received a pointerup/pointercancel without flushing all pointerevents from the
			// buffer, the gesture wasn't recognised as a stroke. Thus, the editor isn't expecting a pointerup/
			// pointercancel event.
			else if (
				(eventName === 'pointerup' || eventName === 'pointercancel')
				&& gestureData[pointerId] && gestureData[pointerId].eventBuffer.length > 0
			) {
				this.releasePointerCapture(elem, event.pointerId);

				// Don't send to the editor.
				sendToEditor = false;

				delete gestureData[pointerId];
			}

			// Forward all other events to the editor.
			return sendToEditor;
		}, otherEventsFilter);
	}

	/** @internal */
	public handleHTMLKeyDownEvent(htmlEvent: KeyboardEvent) {
		console.assert(
			htmlEvent.type === 'keydown',
			`handling a keydown event with type ${htmlEvent.type}`
		);

		const event = keyPressEventFromHTMLEvent(htmlEvent);
		if (this.toolController.dispatchInputEvent(event)) {
			htmlEvent.preventDefault();
			return true;
		} else if (event.key === 't' || event.key === 'T') {
			htmlEvent.preventDefault();
			this.display.rerenderAsText();
			return true;
		} else if (event.key === 'Escape') {
			this.renderingRegion.blur();
			return true;
		}

		return false;
	}

	/** @internal */
	public handleHTMLKeyUpEvent(htmlEvent: KeyboardEvent) {
		console.assert(
			htmlEvent.type === 'keyup',
			`Handling a keyup event with type ${htmlEvent.type}`,
		);

		const event = keyUpEventFromHTMLEvent(htmlEvent);
		if (this.toolController.dispatchInputEvent(event)) {
			htmlEvent.preventDefault();
			return true;
		}
		return false;
	}

	/**
	 * Adds event listners for keypresses (and drop events) on `elem` and forwards those
	 * events to the editor.
	 *
	 * If the given `filter` returns `false` for an event, the event is ignored and not
	 * passed to the editor.
	 */
	public handleKeyEventsFrom(
		elem: HTMLElement,
		filter: (event: KeyboardEvent)=>boolean = ()=>true
	) {
		listenForKeyboardEventsFrom(elem, {
			filter,
			handleKeyDown: (htmlEvent) => {
				this.handleHTMLKeyDownEvent(htmlEvent);
			},
			handleKeyUp: (htmlEvent) => {
				this.handleHTMLKeyUpEvent(htmlEvent);
			},
			getHandlesKeyEventsFrom: (element) => {
				return this.eventListenerTargets.includes(element as HTMLElement);
			},
		});

		// Allow drop.
		elem.ondragover = evt => {
			evt.preventDefault();
		};

		elem.ondrop = evt => {
			this.handleDrop(evt);
		};

		this.eventListenerTargets.push(elem);
	}

	/**
	 * Attempts to prevent **user-triggered** events from modifying
	 * the content of the image.
	 */
	public setReadOnly(readOnly: boolean) {
		if (readOnly !== this.readOnly.get()) {
			this.readOnly.set(readOnly);

			this.notifier.dispatch(EditorEventType.ReadOnlyModeToggled, {
				kind: EditorEventType.ReadOnlyModeToggled,
				editorIsReadOnly: readOnly,
			});
		}
	}

	// @internal
	public isReadOnlyReactiveValue(): ReactiveValue<boolean> {
		return this.readOnly;
	}

	public isReadOnly() {
		return this.readOnly;
	}

	/**
	 * `apply` a command. `command` will be announced for accessibility.
	 *
	 * **Example**:
	 * [[include:doc-pages/inline-examples/adding-a-stroke.md]]
	 */
	public dispatch(command: Command, addToHistory: boolean = true) {
		const dispatchResult = this.dispatchNoAnnounce(command, addToHistory);
		const commandDescription = command.description(this, this.localization);
		this.announceForAccessibility(commandDescription);

		return dispatchResult;
	}

	/**
	 * Dispatches a command without announcing it. By default, does not add to history.
	 * Use this to show finalized commands that don't need to have `announceForAccessibility`
	 * called.
	 *
	 * Prefer `command.apply(editor)` for incomplete commands. `dispatchNoAnnounce` may allow
	 * clients to listen for the application of commands (e.g. `SerializableCommand`s so they can
	 * be sent across the network), while `apply` does not.
	 *
	 * @example
	 * ```
	 * const addToHistory = false;
	 * editor.dispatchNoAnnounce(editor.viewport.zoomTo(someRectangle), addToHistory);
	 * ```
	 */
	public dispatchNoAnnounce(command: Command, addToHistory: boolean = false) {
		const result = command.apply(this);

		if (addToHistory) {
			const apply = false; // Don't double-apply
			this.history.push(command, apply);
		}

		return result;
	}

	/**
	 * Apply a large transformation in chunks.
	 * If `apply` is `false`, the commands are unapplied.
	 * Triggers a re-render after each `updateChunkSize`-sized group of commands
	 * has been applied.
	 */
	public async asyncApplyOrUnapplyCommands(
		commands: Command[], apply: boolean, updateChunkSize: number
	) {
		console.assert(updateChunkSize > 0);
		this.display.setDraftMode(true);
		for (let i = 0; i < commands.length; i += updateChunkSize) {
			this.showLoadingWarning(i / commands.length);

			for (let j = i; j < commands.length && j < i + updateChunkSize; j++) {
				const cmd = commands[j];

				if (apply) {
					cmd.apply(this);
				} else {
					cmd.unapply(this);
				}
			}

			// Re-render to show progress, but only if we're not done.
			if (i + updateChunkSize < commands.length) {
				await new Promise(resolve => {
					this.rerender();
					requestAnimationFrame(resolve);
				});
			}
		}
		this.display.setDraftMode(false);
		this.hideLoadingWarning();
	}

	/** @see {@link asyncApplyOrUnapplyCommands } */
	public asyncApplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, true, chunkSize);
	}

	/**
	 * @see {@link asyncApplyOrUnapplyCommands}
	 *
	 * If `unapplyInReverseOrder`, commands are reversed before unapplying.
	 */
	public asyncUnapplyCommands(commands: Command[], chunkSize: number, unapplyInReverseOrder: boolean = false) {
		if (unapplyInReverseOrder) {
			commands = [ ...commands ]; // copy
			commands.reverse();
		}

		return this.asyncApplyOrUnapplyCommands(commands, false, chunkSize);
	}

	private announceUndoCallback = (command: Command) => {
		this.announceForAccessibility(this.localization.undoAnnouncement(command.description(this, this.localization)));
	};

	private announceRedoCallback = (command: Command) => {
		this.announceForAccessibility(this.localization.redoAnnouncement(command.description(this, this.localization)));
	};

	// Listeners to be called once at the end of the next re-render.
	private nextRerenderListeners: Array<()=> void> = [];
	private rerenderQueued: boolean = false;

	/**
	 * Schedule a re-render for some time in the near future. Does not schedule an additional
	 * re-render if a re-render is already queued.
	 *
	 * @returns a promise that resolves when re-rendering has completed.
	 */
	public queueRerender(): Promise<void> {
		if (!this.rerenderQueued) {
			this.rerenderQueued = true;
			requestAnimationFrame(() => {
				// If .rerender was called manually, we might not need to
				// re-render.
				if (this.rerenderQueued) {
					this.rerender();
					this.rerenderQueued = false;
				}
			});
		}

		return new Promise(resolve => {
			this.nextRerenderListeners.push(() => resolve());
		});
	}

	// @internal
	public isRerenderQueued() {
		return this.rerenderQueued;
	}

	/**
	 * Re-renders the entire image.
	 *
	 * @see {@link Editor.queueRerender}
	 */
	public rerender(showImageBounds: boolean = true) {
		this.display.startRerender();

		// Don't render if the display has zero size.
		if (this.display.width === 0 || this.display.height === 0) {
			return;
		}

		const renderer = this.display.getDryInkRenderer();

		this.image.renderWithCache(renderer, this.display.getCache(), this.viewport);

		// Draw a rectangle around the region that will be visible on save
		if (showImageBounds && !this.image.getAutoresizeEnabled()) {
			const exportRectFill = { fill: Color4.fromHex('#44444455') };
			const exportRectStrokeWidth = 5 * this.viewport.getSizeOfPixelOnCanvas();
			renderer.drawRect(
				this.getImportExportRect(),
				exportRectStrokeWidth,
				exportRectFill
			);
		}

		this.rerenderQueued = false;
		this.nextRerenderListeners.forEach(listener => listener());
		this.nextRerenderListeners = [];
	}

	/**
	 * Draws the given path onto the wet ink renderer. The given path will
	 * be displayed on top of the main image.
	 *
	 * @see {@link Display.getWetInkRenderer} {@link Display.flatten}
	 */
	public drawWetInk(...path: RenderablePathSpec[]) {
		for (const part of path) {
			this.display.getWetInkRenderer().drawPath(part);
		}
	}

	/**
	 * Clears the wet ink display.
	 *
	 * The wet ink display can be used by the currently active tool to display a preview
	 * of an in-progress action.
	 *
	 * @see {@link Display.getWetInkRenderer}
	 */
	public clearWetInk() {
		this.display.getWetInkRenderer().clear();
	}

	/**
	 * Focuses the region used for text input/key commands.
	 */
	public focus() {
		this.renderingRegion.focus();
	}

	/**
	 * Creates an element that will be positioned on top of the dry/wet ink
	 * renderers.
	 *
	 * So as not to change the position of other overlays, `overlay` should either
	 * be styled to have 0 height or have `position: absolute`.
	 *
	 * This is useful for displaying content on top of the rendered content
	 * (e.g. a selection box).
	 */
	public createHTMLOverlay(overlay: HTMLElement) {
		overlay.classList.add('overlay', 'js-draw-editor-overlay');
		this.container.appendChild(overlay);

		return {
			remove: () => overlay.remove(),
		};
	}

	/**
	 * Creates a CSS stylesheet with `content` and applies it to the document
	 * (and thus, to this editor).
	 */
	public addStyleSheet(content: string): HTMLStyleElement {
		const styleSheet = document.createElement('style');
		styleSheet.innerText = content;
		this.container.appendChild(styleSheet);

		return styleSheet;
	}

	/**
	 * Dispatch a keyboard event to the currently selected tool.
	 * Intended for unit testing.
	 *
	 * If `shiftKey` is undefined, it is guessed from `key`.
	 *
	 * At present, the **key code** dispatched is guessed from the given key and,
	 * while this works for ASCII alphanumeric characters, this does not work for
	 * most non-alphanumeric keys.
	 *
	 * Because guessing the key code from `key` is problematic, **only use this for testing**.
	 */
	public sendKeyboardEvent(
		eventType: InputEvtType.KeyPressEvent|InputEvtType.KeyUpEvent,
		key: string,
		ctrlKey: boolean = false,
		altKey: boolean = false,
		shiftKey: boolean|undefined = undefined,
	) {
		shiftKey ??= key.toUpperCase() === key && key.toLowerCase() !== key;

		this.toolController.dispatchInputEvent({
			kind: eventType,
			key,
			code: guessKeyCodeFromKey(key),
			ctrlKey,
			altKey,
			shiftKey,
		});
	}

	/**
	 * Dispatch a pen event to the currently selected tool.
	 * Intended primarially for unit tests.
	 *
	 * @deprecated
	 * @see {@link sendPenEvent} {@link sendTouchEvent}
	 */
	public sendPenEvent(
		eventType: PointerEvtType,
		point: Point2,

		// @deprecated
		allPointers?: Pointer[]
	) {
		sendPenEvent(this, eventType, point, allPointers);
	}

	/**
	 * Adds all components in `components` such that they are in the center of the screen.
	 * This is a convenience method that creates **and applies** a single command.
	 *
	 * If `selectComponents` is true (the default), the components are selected.
	 *
	 * `actionDescription`, if given, should be a screenreader-friendly description of the
	 * reason components were added (e.g. "pasted").
	 */
	public async addAndCenterComponents(components: AbstractComponent[], selectComponents: boolean = true, actionDescription?: string) {
		let bbox: Rect2|null = null;
		for (const component of components) {
			if (bbox) {
				bbox = bbox.union(component.getBBox());
			} else {
				bbox = component.getBBox();
			}
		}

		if (!bbox) {
			return;
		}

		// Find a transform that scales/moves bbox onto the screen.
		const visibleRect = this.viewport.visibleRect;
		const scaleRatioX = visibleRect.width / bbox.width;
		const scaleRatioY = visibleRect.height / bbox.height;

		let scaleRatio = scaleRatioX;
		if (bbox.width * scaleRatio > visibleRect.width || bbox.height * scaleRatio > visibleRect.height) {
			scaleRatio = scaleRatioY;
		}
		scaleRatio *= 2 / 3;

		scaleRatio = Viewport.roundScaleRatio(scaleRatio);

		const transfm = Mat33.translation(
			visibleRect.center.minus(bbox.center)
		).rightMul(
			Mat33.scaling2D(scaleRatio, bbox.center)
		);

		const commands: Command[] = [];
		for (const component of components) {
			// To allow deserialization, we need to add first, then transform.
			commands.push(EditorImage.addElement(component));
			commands.push(component.transformBy(transfm));
		}

		const applyChunkSize = 100;
		await this.dispatch(
			uniteCommands(commands, { applyChunkSize, description: actionDescription }),
			true,
		);

		if (selectComponents) {
			for (const selectionTool of this.toolController.getMatchingTools(SelectionTool)) {
				selectionTool.setEnabled(true);
				selectionTool.setSelection(components);
			}
		}
	}

	/**
	 * Get a data URL (e.g. as produced by `HTMLCanvasElement::toDataURL`).
	 * If `format` is not `image/png`, a PNG image URL may still be returned (as in the
	 * case of `HTMLCanvasElement::toDataURL`).
	 *
	 * The export resolution is the same as the size of the drawing canvas, unless `outputSize`
	 * is given.
	 *
	 * **Example**:
	 * [[include:doc-pages/inline-examples/adding-an-image-and-data-urls.md]]
	 */
	public toDataURL(format: 'image/png'|'image/jpeg'|'image/webp' = 'image/png', outputSize?: Vec2): string {
		const { element: canvas, renderer } = CanvasRenderer.fromViewport(this.image.getImportExportViewport(), { canvasSize: outputSize });

		this.image.renderAll(renderer);

		const dataURL = canvas.toDataURL(format);
		return dataURL;
	}

	/**
	 * Converts the editor's content into an SVG image.
	 *
	 * If the output SVG has width or height less than `options.minDimension`, its size
	 * will be increased.
	 *
	 * @see
	 * {@link SVGRenderer}
	 */
	public toSVG(options?: { minDimension?: number }): SVGElement {
		return editorImageToSVGSync(this.image, options ?? {});
	}

	/**
	 * Converts the editor's content into an SVG image in an asynchronous,
	 * but **potentially lossy** way.
	 *
	 * **Warning**: If the image is being edited during an async rendering, edited components
	 * may not be rendered.
	 *
	 * Like {@link toSVG}, but can be configured to briefly pause after processing every
	 * `pauseAfterCount` items. This can prevent the editor from becoming unresponsive
	 * when saving very large images.
	 */
	public async toSVGAsync(
		options: {
			minDimension?: number,

			// Number of components to process before pausing
			pauseAfterCount?: number,

			// Returns false to cancel the render.
			// Note that totalToProcess is the total for the currently-being-processed layer.
			onProgress?: (processedCountInLayer: number, totalToProcessInLayer: number)=>Promise<void|boolean>,
		} = {},
	): Promise<SVGElement> {
		const pauseAfterCount = options.pauseAfterCount ?? 100;

		return await editorImageToSVGAsync(this.image, async (_component, processedCount, totalComponents) => {
			if (options.onProgress) {
				const shouldContinue = await options.onProgress(processedCount, totalComponents);

				if (shouldContinue === false) {
					return false;
				}
			}

			if (processedCount % pauseAfterCount === 0) {
				await untilNextAnimationFrame();
			}

			return true;
		}, {
			minDimension: options.minDimension,
		});
	}

	/**
	 * Load editor data from an `ImageLoader` (e.g. an {@link SVGLoader}).
	 *
	 * @see loadFromSVG
	 */
	public async loadFrom(loader: ImageLoader) {
		this.showLoadingWarning(0);
		this.display.setDraftMode(true);

		const originalBackgrounds = this.image.getBackgroundComponents();
		const eraseBackgroundCommand = new Erase(originalBackgrounds);

		await loader.start(async (component) => {
			await this.dispatchNoAnnounce(EditorImage.addElement(component));
		}, (countProcessed: number, totalToProcess: number) => {
			if (countProcessed % 500 === 0) {
				this.showLoadingWarning(countProcessed / totalToProcess);
				this.rerender();
				return untilNextAnimationFrame();
			}

			return null;
		}, (importExportRect, options) => {
			this.dispatchNoAnnounce(this.setImportExportRect(importExportRect), false);
			this.dispatchNoAnnounce(this.viewport.zoomTo(importExportRect), false);

			if (options) {
				this.dispatchNoAnnounce(
					this.image.setAutoresizeEnabled(options.autoresize),
					false,
				);
			}
		});

		// Ensure that we don't have multiple overlapping BackgroundComponents. Remove
		// old BackgroundComponents.
		// Overlapping BackgroundComponents may cause changing the background color to
		// not work properly.
		if (this.image.getBackgroundComponents().length !== originalBackgrounds.length) {
			await this.dispatchNoAnnounce(eraseBackgroundCommand);
		}

		this.hideLoadingWarning();

		this.display.setDraftMode(false);
		this.queueRerender();
	}

	private getTopmostBackgroundComponent(): BackgroundComponent|null {
		let background: BackgroundComponent|null = null;

		// Find a background component, if one exists.
		// Use the last (topmost) background component if there are multiple.
		for (const component of this.image.getBackgroundComponents()) {
			if (component instanceof BackgroundComponent) {
				background = component;
			}
		}

		return background;
	}

	/**
	 * This is a convenience method for adding or updating the {@link BackgroundComponent}
	 * and {@link EditorImage.setAutoresizeEnabled} for the current image.
	 *
	 * If there are multiple {@link BackgroundComponent}s in the image, this only modifies
	 * the topmost such element.
	 *
	 * **Example**:
	 * ```ts,runnable
	 * import { Editor, Color4, BackgroundComponentBackgroundType } from 'js-draw';
	 * const editor = new Editor(document.body);
	 * editor.dispatch(editor.setBackgroundStyle({
	 *     color: Color4.orange,
	 *     type: BackgroundComponentBackgroundType.Grid,
	 *     autoresize: true,
	 * }));
	 * ```
	 *
	 * To change the background size, see {@link EditorImage.setImportExportRect}.
	 */
	public setBackgroundStyle(style: { color?: Color4, type?: BackgroundType, autoresize?: boolean }) {
		const originalBackground = this.getTopmostBackgroundComponent();
		const commands: Command[] = [];
		if (originalBackground) {
			commands.push(new Erase([ originalBackground ]));
		}
		const originalType = originalBackground?.getBackgroundType?.() ?? BackgroundType.None;
		const originalColor = originalBackground?.getStyle?.().color ?? Color4.transparent;
		const originalFillsScreen = this.image.getAutoresizeEnabled();

		const defaultType = (style.color && originalType === BackgroundType.None ? BackgroundType.SolidColor : originalType);
		const backgroundType = style.type ?? defaultType;
		const backgroundColor = style.color ?? originalColor;
		const fillsScreen = style.autoresize ?? originalFillsScreen;

		if (backgroundType !== BackgroundType.None) {
			const newBackground = new BackgroundComponent(backgroundType, backgroundColor);
			commands.push(EditorImage.addElement(newBackground));
		}
		if (fillsScreen !== originalFillsScreen) {
			commands.push(this.image.setAutoresizeEnabled(fillsScreen));

			// Avoid 0x0 backgrounds
			if (!fillsScreen && this.image.getImportExportRect().maxDimension === 0) {
				commands.push(
					this.image.setImportExportRect(
						this.image.getImportExportRect().resizedTo(Vec2.of(500, 500))
					),
				);
			}
		}
		return uniteCommands(commands);
	}

	/**
	 * Set the background color of the image.
	 *
	 * This is a convenience method for adding or updating the {@link BackgroundComponent}
	 * for the current image.
	 *
	 * @see {@link setBackgroundStyle}
	 */
	public setBackgroundColor(color: Color4): Command {
		let background = this.getTopmostBackgroundComponent();

		if (!background) {
			const backgroundType = color.eq(Color4.transparent) ? BackgroundType.None : BackgroundType.SolidColor;
			background = new BackgroundComponent(backgroundType, color);
			return this.image.addElement(background);
		} else {
			return background.updateStyle({ color });
		}
	}

	/**
	 * @returns the average of the colors of all background components. Use this to get the current background
	 * color.
	 */
	public estimateBackgroundColor(): Color4 {
		const backgroundColors = [];

		for (const component of this.image.getBackgroundComponents()) {
			if (component instanceof BackgroundComponent) {
				backgroundColors.push(component.getStyle().color ?? Color4.transparent);
			}
		}

		return Color4.average(backgroundColors);
	}

	// Returns the size of the visible region of the output SVG
	public getImportExportRect(): Rect2 {
		return this.image.getImportExportViewport().visibleRect;
	}

	// Resize the output SVG to match `imageRect`.
	public setImportExportRect(imageRect: Rect2): Command {
		return this.image.setImportExportRect(imageRect);
	}

	/**
	 * Alias for `loadFrom(SVGLoader.fromString)`.
	 *
	 * @example
	 * ```ts,runnable
	 * import {Editor} from 'js-draw';
	 * const editor = new Editor(document.body);
	 *
	 * ---visible---
	 * await editor.loadFromSVG(`
	 *   <svg viewBox="5 23 52 30" width="52" height="16" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
	 *     <text style="
	 *       transform: matrix(0.181846, 0.1, 0, 0.181846, 11.4, 33.2);
	 *       font-family: serif;
	 *       font-size: 32px;
	 *       fill: rgb(100, 140, 61);
	 *     ">An SVG image!</text>
	 *   </svg>
	 * `);
	 * ```
	 */
	public async loadFromSVG(svgData: string, sanitize: boolean = false) {
		const loader = SVGLoader.fromString(svgData, sanitize);
		await this.loadFrom(loader);
	}

	private closeAboutDialog: (()=>void)|null = null;

	/**
	 * Shows an information dialog with legal notices.
	 */
	public showAboutDialog() {
		const iconLicenseText = this.icons.licenseInfo();

		const notices: AboutDialogEntry[] = [];

		if (this.settings.appInfo) {
			const descriptionLines = [];
			if (this.settings.appInfo.version) {
				descriptionLines.push(`v${this.settings.appInfo.version}`, '');
			}

			if (this.settings.appInfo.description) {
				descriptionLines.push(this.settings.appInfo.description + '\n');
			} else {
				descriptionLines.push(`js-draw v${version.number}`);
			}

			notices.push({
				heading: `${this.settings.appInfo.name}`,
				text: descriptionLines.join('\n'),
			});
		} else {
			notices.push({
				heading: 'js-draw',
				text: `v${version.number}`,
			});
		}

		const screenSize = this.viewport.getScreenRectSize();
		notices.push({
			heading: this.localization.developerInformation,
			text: [
				'Image debug information (from when this dialog was opened):',
				`    ${this.viewport.getScaleFactor()}x zoom, ${180/Math.PI * this.viewport.getRotationAngle()}° rotation`,
				`    ${this.image.estimateNumElements()} components`,
				`    auto-resize: ${this.image.getAutoresizeEnabled() ? 'enabled' : 'disabled'}`,
				`    image size: ${this.getImportExportRect().w}x${this.getImportExportRect().h}`,
				`    screen size: ${screenSize.x}x${screenSize.y}`,
				`    device pixel ratio: ${this.display.getDevicePixelRatio()}`,
				'    cache:',
				`        ${
					this.display.getCache().getDebugInfo()
						// Indent
						.replace(/([\n])/g, '\n        ')
				}`,
			].join('\n'),
			minimized: true,
		});

		notices.push({
			heading: this.localization.softwareLibraries,
			text: [
				`This image editor is powered by js-draw v${version.number}.`,
				'',
				'At runtime, js-draw uses',
				' - The Coloris color picker: https://github.com/mdbassit/Coloris',
				' - The bezier.js Bézier curve library: https://github.com/Pomax/bezierjs',
				'',
				'Both are licensed under the MIT license:',
				'',
				'',
				'== Coloris ==',
				mitLicenseAttribution('2021 Mohammed Bassit'),
				'',
				'',
				'== Bezier.js ==',
				mitLicenseAttribution('2023 Mike "Pomax" Kamermans'),
				'',
				'',
				'== js-draw ==',
				mitLicenseAttribution('2023-2024 Henry Heino'),
				'',
			].join('\n'),
			minimized: true,
		});

		if (iconLicenseText) {
			notices.push({
				heading: 'Icon Pack',
				text: iconLicenseText,
				minimized: true,
			});
		}

		notices.push(...this.settings.notices);


		this.closeAboutDialog?.();
		this.closeAboutDialog = makeAboutDialog(this, notices).close;
	}

	/**
	 * Removes and **destroys** the editor. The editor cannot be added to a parent
	 * again after calling this method.
	 */
	public remove() {
		this.container.remove();

		// TODO: Is additional cleanup necessary here?
		this.toolController.onEditorDestroyed();
	}
}

export default Editor;
