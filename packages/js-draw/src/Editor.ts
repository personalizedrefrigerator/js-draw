import EditorImage from './EditorImage';
import ToolController from './tools/ToolController';
import { EditorNotifier, EditorEventType, ImageLoader } from './types';
import { HTMLPointerEventName, HTMLPointerEventFilter, InputEvtType, PointerEvt, keyUpEventFromHTMLEvent, keyPressEventFromHTMLEvent } from './inputEvents';
import Command from './commands/Command';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from './EventDispatcher';
import { Point2, Vec2, Vec3, Color4, Mat33, Rect2, toRoundedString } from '@js-draw/math';
import Display, { RenderingMode } from './rendering/Display';
import SVGRenderer from './rendering/renderers/SVGRenderer';
import SVGLoader from './SVGLoader';
import Pointer from './Pointer';
import { EditorLocalization } from './localization';
import getLocalizationTable from './localizations/getLocalizationTable';
import IconProvider from './toolbar/IconProvider';
import CanvasRenderer from './rendering/renderers/CanvasRenderer';
import untilNextAnimationFrame from './util/untilNextAnimationFrame';
import fileToBase64 from './util/fileToBase64';
import uniteCommands from './commands/uniteCommands';
import SelectionTool from './tools/SelectionTool/SelectionTool';
import AbstractComponent from './components/AbstractComponent';
import Erase from './commands/Erase';
import BackgroundComponent, { BackgroundType } from './components/BackgroundComponent';
import sendPenEvent from './testing/sendPenEvent';
import KeyboardShortcutManager from './shortcuts/KeyboardShortcutManager';
import KeyBinding from './shortcuts/KeyBinding';
import AbstractToolbar from './toolbar/AbstractToolbar';
import SidebarToolbar from './toolbar/SidebarToolbar';
import StrokeKeyboardControl from './tools/InputFilter/StrokeKeyboardControl';
import guessKeyCodeFromKey from './util/guessKeyCodeFromKey';
import RenderablePathSpec from './rendering/RenderablePathSpec';

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

	/** Minimum zoom fraction (e.g. 0.5 → 50% zoom). */
	minZoom: number,
	maxZoom: number,

	/**
	 * Overrides for keyboard shortcuts. For example,
	 * ```ts
	 * {
	 * 	'some.shortcut.id': [ ShortcutManager.keyboardShortcutFromString('ctrl+a') ],
	 * 	'another.shortcut.id': [ ]
	 * }
	 * ```
	 * where shortcut IDs map to lists of associated keybindings.
	 */
	keyboardShortcutOverrides: Record<string, Array<KeyBinding>>,

	iconProvider: IconProvider,
}

/**
 * The main entrypoint for the full editor.
 *
 * @example
 * To create an editor with a toolbar,
 * ```
 * const editor = new Editor(document.body);
 *
 * const toolbar = editor.addToolbar();
 * toolbar.addActionButton('Save', () => {
 *   const saveData = editor.toSVG().outerHTML;
 *   // Do something with saveData...
 * });
 * ```
 *
 * See also
 * [`docs/example/example.ts`](https://github.com/personalizedrefrigerator/js-draw/blob/main/docs/demo/example.ts#L15).
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
	 * ```
	 * const editor = new Editor(document.body);
	 *
	 * // Create a path.
	 * const stroke = new Stroke([
	 *   Path.fromString('M0,0 L30,30 z').toRenderable({ fill: Color4.black }),
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
	 */
	public readonly notifier: EditorNotifier;

	private loadingWarning: HTMLElement;
	private accessibilityAnnounceArea: HTMLElement;
	private accessibilityControlArea: HTMLTextAreaElement;
	private eventListenerTargets: HTMLElement[] = [];

	private settings: EditorSettings;

	/**
	 * @example
	 * ```
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
	 * // Add a save button
	 * toolbar.addActionButton({
	 *   label: 'Save'
	 *   icon: createSaveIcon(),
	 * }, () => {
	 *   const saveData = editor.toSVG().outerHTML;
	 *   // Do something with saveData
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
		};
		this.icons = this.settings.iconProvider;

		this.shortcuts = new KeyboardShortcutManager(this.settings.keyboardShortcutOverrides);

		this.container = document.createElement('div');
		this.renderingRegion = document.createElement('div');
		this.container.appendChild(this.renderingRegion);
		this.container.className = 'imageEditorContainer';

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

		parent.appendChild(this.container);

		this.viewport.updateScreenSize(
			Vec2.of(this.display.width, this.display.height)
		);

		this.registerListeners();
		this.queueRerender();
		this.hideLoadingWarning();


		// Enforce zoom limits.
		this.notifier.on(EditorEventType.ViewportChanged, evt => {
			if (evt.kind === EditorEventType.ViewportChanged) {
				const zoom = evt.newTransform.transformVec3(Vec2.unitX).length();
				if (zoom > this.settings.maxZoom || zoom < this.settings.minZoom) {
					const oldZoom = evt.oldTransform.transformVec3(Vec2.unitX).length();
					let resetTransform = Mat33.identity;

					if (oldZoom <= this.settings.maxZoom && oldZoom >= this.settings.minZoom) {
						resetTransform = evt.oldTransform;
					}

					this.viewport.resetTransform(resetTransform);
				}
			}
		});
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

	/** @param fractionLoaded - should be a number from 0 to 1, where 1 represents completely loaded. */
	public showLoadingWarning(fractionLoaded: number) {
		const loadingPercent = Math.round(fractionLoaded * 100);
		this.loadingWarning.innerText = this.localization.loading(loadingPercent);
		this.loadingWarning.style.display = 'block';
	}

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
		const toolbar = new SidebarToolbar(this, this.container, this.localization);

		if (defaultLayout) {
			toolbar.addDefaults();
		}

		return toolbar;
	}

	private registerListeners() {
		this.handlePointerEventsFrom(this.renderingRegion);
		this.handleKeyEventsFrom(this.renderingRegion);

		this.container.addEventListener('wheel', evt => {
			let delta = Vec3.of(evt.deltaX, evt.deltaY, evt.deltaZ);

			// Process wheel events if the ctrl key is down, even if disabled -- we do want to handle
			// pinch-zooming.
			if (!evt.ctrlKey && !evt.metaKey) {
				if (!this.settings.wheelEventsEnabled) {
					return;
				} else if (this.settings.wheelEventsEnabled === 'only-if-focused') {
					const focusedChild = this.container.querySelector(':focus');

					if (!focusedChild) {
						return;
					}
				}
			}

			if (evt.deltaMode === WheelEvent.DOM_DELTA_LINE) {
				delta = delta.times(15);
			} else if (evt.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
				delta = delta.times(100);
			}

			if (evt.ctrlKey || evt.metaKey) {
				delta = Vec3.of(0, 0, evt.deltaY);
			}

			// Ensure that `pos` is relative to `this.renderingRegion`
			const bbox = this.renderingRegion.getBoundingClientRect();
			const pos = Vec2.of(evt.clientX, evt.clientY).minus(Vec2.of(bbox.left, bbox.top));

			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.WheelEvt,
				delta,
				screenPos: pos,
			})) {
				evt.preventDefault();
				return true;
			}
			return false;
		});

		this.notifier.on(EditorEventType.DisplayResized, _event => {
			this.viewport.updateScreenSize(
				Vec2.of(this.display.width, this.display.height)
			);
			this.queueRerender();
		});

		const handleResize = () => {
			this.notifier.dispatch(EditorEventType.DisplayResized, {
				kind: EditorEventType.DisplayResized,
				newSize: Vec2.of(
					this.display.width,
					this.display.height
				),
			});
		};

		if ('ResizeObserver' in (window as any)) {
			const resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(this.container);
		} else {
			addEventListener('resize', handleResize);
		}

		this.accessibilityControlArea.addEventListener('input', () => {
			this.accessibilityControlArea.value = '';
		});

		document.addEventListener('copy', evt => {
			if (!this.isEventSink(document.querySelector(':focus'))) {
				return;
			}

			const clipboardData = evt.clipboardData;

			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.CopyEvent,
				setData: (mime, data) => {
					clipboardData?.setData(mime, data);
				},
			})) {
				evt.preventDefault();
			}
		});

		document.addEventListener('paste', evt => {
			this.handlePaste(evt);
		});
	}

	private pointers: Record<number, Pointer> = {};
	private getPointerList() {
		const nowTime = (new Date()).getTime();

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
	 * Dispatches a `PointerEvent` to the editor. The target element for `evt` must have the same top left
	 * as the content of the editor.
	 */
	public handleHTMLPointerEvent(eventType: 'pointerdown'|'pointermove'|'pointerup'|'pointercancel', evt: PointerEvent): boolean {
		const eventsRelativeTo = this.renderingRegion;
		const eventTarget = (evt.target as HTMLElement|null) ?? this.renderingRegion;

		if (eventType === 'pointerdown') {
			const pointer = Pointer.ofEvent(evt, true, this.viewport, eventsRelativeTo);
			this.pointers[pointer.id] = pointer;

			eventTarget.setPointerCapture(pointer.id);
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
					const distanceMoved = pointer.screenPos.minus(prevData.screenPos).magnitude();

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

			this.pointers[pointer.id] = pointer;
			eventTarget.releasePointerCapture(pointer.id);
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

			currentElem = (currentElem as Element).parentElement;
		}
		return false;
	}

	private async handlePaste(evt: DragEvent|ClipboardEvent) {
		const target = document.querySelector(':focus') ?? evt.target;
		if (!this.isEventSink(target)) {
			return;
		}

		const clipboardData: DataTransfer = (evt as any).dataTransfer ?? (evt as any).clipboardData;
		if (!clipboardData) {
			return;
		}

		// Handle SVG files (prefer to PNG/JPEG)
		for (const file of clipboardData.files) {
			if (file.type.toLowerCase() === 'image/svg+xml') {
				const text = await file.text();
				if (this.toolController.dispatchInputEvent({
					kind: InputEvtType.PasteEvent,
					mime: file.type,
					data: text,
				})) {
					evt.preventDefault();
					return;
				}
			}
		}

		// Handle image files.
		for (const file of clipboardData.files) {
			const fileType = file.type.toLowerCase();
			if (fileType === 'image/png' || fileType === 'image/jpg') {
				this.showLoadingWarning(0);
				const onprogress = (evt: ProgressEvent<FileReader>) => {
					this.showLoadingWarning(evt.loaded / evt.total);
				};

				try {
					const data = await fileToBase64(file, onprogress);

					if (data && this.toolController.dispatchInputEvent({
						kind: InputEvtType.PasteEvent,
						mime: fileType,
						data: data,
					})) {
						evt.preventDefault();
						this.hideLoadingWarning();
						return;
					}
				} catch (e) {
					console.error('Error reading image:', e);
				}
				this.hideLoadingWarning();
			}
		}

		// Supported MIMEs for text data, in order of preference
		const supportedMIMEs = [
			'image/svg+xml',
			'text/plain',
		];

		for (const mime of supportedMIMEs) {
			const data = clipboardData.getData(mime);

			if (data && this.toolController.dispatchInputEvent({
				kind: InputEvtType.PasteEvent,
				mime,
				data,
			})) {
				evt.preventDefault();
				return;
			}
		}
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
		// Buffer events: Send events to the editor only if the pointer has moved enough to
		// suggest that the user is attempting to draw, rather than click to close the color picker.
		let eventBuffer: [ HTMLPointerEventName, PointerEvent ][] = [];
		let gestureStartPos: Point2|null = null;

		return this.handlePointerEventsFrom(elem, (eventName, event) => {
			if (filter && !filter(eventName, event)) {
				return false;
			}

			// Position of the current event.
			const currentPos = Vec2.of(event.pageX, event.pageY);

			// Whether to send the current event to the editor
			let sendToEditor = true;

			if (eventName === 'pointerdown') {
				// Buffer the event, but don't send it to the editor yet.
				// We don't want to send single-click events, but we do want to send full strokes.
				eventBuffer = [];
				eventBuffer.push([ eventName, event ]);
				gestureStartPos = currentPos;

				// Capture the pointer so we receive future events even if the overlay is hidden.
				elem.setPointerCapture(event.pointerId);

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
						this.handleHTMLPointerEvent(eventName, event);
					}

					eventBuffer = [];
					sendToEditor = true;
				}
			}
			// Otherwise, if we received a pointerup/pointercancel without flushing all pointerevents from the
			// buffer, the gesture wasn't recognised as a stroke. Thus, the editor isn't expecting a pointerup/
			// pointercancel event.
			else if ((eventName === 'pointerup' || eventName === 'pointercancel') && eventBuffer.length > 0) {
				elem.releasePointerCapture(event.pointerId);
				eventBuffer = [];

				// Don't send to the editor.
				sendToEditor = false;
			}

			// Forward all other events to the editor.
			return sendToEditor;
		}, otherEventsFilter);
	}

	/**
	 * Adds event listners for keypresses to `elem` and forwards those events to the editor.
	 *
	 * If the given `filter` returns `false` for an event, the event is ignored and not passed to the editor.
	 */
	public handleKeyEventsFrom(elem: HTMLElement, filter: (event: KeyboardEvent)=>boolean = ()=>true) {
		elem.addEventListener('keydown', htmlEvent => {
			if (!filter(htmlEvent)) {
				return;
			}

			const event = keyPressEventFromHTMLEvent(htmlEvent);
			if (event.key === 't' || event.key === 'T') {
				htmlEvent.preventDefault();
				this.display.rerenderAsText();
			} else if (this.toolController.dispatchInputEvent(event)) {
				htmlEvent.preventDefault();
			} else if (event.key === 'Escape') {
				this.renderingRegion.blur();
			}
		});

		elem.addEventListener('keyup', htmlEvent => {
			if (!filter(htmlEvent)) {
				return;
			}

			const event = keyUpEventFromHTMLEvent(htmlEvent);
			if (this.toolController.dispatchInputEvent(event)) {
				htmlEvent.preventDefault();
			}
		});

		// Allow drop.
		elem.ondragover = evt => {
			evt.preventDefault();
		};

		elem.ondrop = evt => {
			evt.preventDefault();
			this.handlePaste(evt);
		};

		this.eventListenerTargets.push(elem);
	}

	/** `apply` a command. `command` will be announced for accessibility. */
	public dispatch(command: Command, addToHistory: boolean = true) {
		const dispatchResult = this.dispatchNoAnnounce(command, addToHistory);
		this.announceForAccessibility(command.description(this, this.localization));

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

	// @see {@link #asyncApplyOrUnapplyCommands }
	public asyncApplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, true, chunkSize);
	}

	// If `unapplyInReverseOrder`, commands are reversed before unapplying.
	// @see {@link #asyncApplyOrUnapplyCommands }
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

		// Draw a rectangle around the region that will be visible on save
		const renderer = this.display.getDryInkRenderer();

		this.image.renderWithCache(renderer, this.display.getCache(), this.viewport);

		if (showImageBounds) {
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
	 * This is useful for displaying content on top of the rendered content
	 * (e.g. a selection box).
	 */
	public createHTMLOverlay(overlay: HTMLElement) {
		overlay.classList.add('overlay');
		this.container.appendChild(overlay);

		return {
			remove: () => overlay.remove(),
		};
	}

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
		eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
		point: Point2,

		// @deprecated
		allPointers?: Pointer[]
	) {
		sendPenEvent(this, eventType, point, allPointers);
	}

	public async addAndCenterComponents(components: AbstractComponent[], selectComponents: boolean = true) {
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
		await this.dispatch(uniteCommands(commands, applyChunkSize), true);

		if (selectComponents) {
			for (const selectionTool of this.toolController.getMatchingTools(SelectionTool)) {
				selectionTool.setEnabled(true);
				selectionTool.setSelection(components);
			}
		}
	}

	// Get a data URL (e.g. as produced by `HTMLCanvasElement::toDataURL`).
	// If `format` is not `image/png`, a PNG image URL may still be returned (as in the
	// case of `HTMLCanvasElement::toDataURL`).
	//
	// The export resolution is the same as the size of the drawing canvas.
	public toDataURL(format: 'image/png'|'image/jpeg'|'image/webp' = 'image/png', outputSize?: Vec2): string {
		const canvas = document.createElement('canvas');

		const importExportViewport = this.image.getImportExportViewport();
		const exportRectSize = importExportViewport.getScreenRectSize();
		const resolution = outputSize ?? exportRectSize;

		canvas.width = resolution.x;
		canvas.height = resolution.y;

		const ctx = canvas.getContext('2d')!;

		// Scale to ensure that the entire output is visible.
		const scaleFactor = Math.min(resolution.x / exportRectSize.x, resolution.y / exportRectSize.y);
		ctx.scale(scaleFactor, scaleFactor);

		const renderer = new CanvasRenderer(ctx, importExportViewport);

		this.image.renderAll(renderer);

		const dataURL = canvas.toDataURL(format);
		return dataURL;
	}

	public toSVG(): SVGElement {
		const importExportViewport = this.image.getImportExportViewport().getTemporaryClone();

		const sanitize = false;
		const { element: result, renderer } = SVGRenderer.fromViewport(importExportViewport, sanitize);

		const origTransform = importExportViewport.canvasToScreenTransform;
		// Render with (0,0) at (0,0) — we'll handle translation with
		// the viewBox property.
		importExportViewport.resetTransform(Mat33.identity);

		this.image.renderAll(renderer);

		importExportViewport.resetTransform(origTransform);


		// Just show the main region
		const rect = importExportViewport.visibleRect;
		result.setAttribute('viewBox', [rect.x, rect.y, rect.w, rect.h].map(part => toRoundedString(part)).join(' '));
		result.setAttribute('width', toRoundedString(rect.w));
		result.setAttribute('height', toRoundedString(rect.h));

		return result;
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
		}, (importExportRect: Rect2) => {
			this.dispatchNoAnnounce(this.setImportExportRect(importExportRect), false);
			this.dispatchNoAnnounce(this.viewport.zoomTo(importExportRect), false);
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
	 * Set the background color of the image.
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
	 * Alias for loadFrom(SVGLoader.fromString).
	 *
	 * This is particularly useful when accessing a bundled version of the editor,
	 * where `SVGLoader.fromString` is unavailable.
	 */
	public async loadFromSVG(svgData: string, sanitize: boolean = false) {
		const loader = SVGLoader.fromString(svgData, sanitize);
		await this.loadFrom(loader);
	}
}

export default Editor;
