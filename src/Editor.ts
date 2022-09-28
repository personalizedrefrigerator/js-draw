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
 * @packageDocumentation
 */


import EditorImage from './EditorImage';
import ToolController from './tools/ToolController';
import { InputEvtType, PointerEvt, EditorNotifier, EditorEventType, ImageLoader } from './types';
import Command from './commands/Command';
import UndoRedoHistory from './UndoRedoHistory';
import Viewport from './Viewport';
import EventDispatcher from './EventDispatcher';
import { Point2, Vec2 } from './math/Vec2';
import Vec3 from './math/Vec3';
import HTMLToolbar from './toolbar/HTMLToolbar';
import { RenderablePathSpec } from './rendering/renderers/AbstractRenderer';
import Display, { RenderingMode } from './rendering/Display';
import SVGRenderer from './rendering/renderers/SVGRenderer';
import Color4 from './Color4';
import SVGLoader from './SVGLoader';
import Pointer from './Pointer';
import Mat33 from './math/Mat33';
import Rect2 from './math/Rect2';
import { EditorLocalization } from './localization';
import getLocalizationTable from './localizations/getLocalizationTable';

type HTMLPointerEventType = 'pointerdown'|'pointermove'|'pointerup'|'pointercancel';
type HTMLPointerEventFilter = (eventName: HTMLPointerEventType, event: PointerEvent)=>boolean;

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
}

// { @inheritDoc Editor! }
export class Editor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private renderingRegion: HTMLElement;

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
	public image: EditorImage;

	/** Viewport for the exported/imported image. */
	private importExportViewport: Viewport;

	/** @internal */
	public localization: EditorLocalization;

	public viewport: Viewport;
	public toolController: ToolController;

	/**
	 * Global event dispatcher/subscriber.
	 * @see {@link types.EditorEventType}
	 */
	public notifier: EditorNotifier;

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
		};

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
		this.importExportViewport = new Viewport(this.notifier);
		this.viewport = new Viewport(this.notifier);
		this.display = new Display(this, this.settings.renderingMode, this.renderingRegion);
		this.image = new EditorImage();
		this.history = new UndoRedoHistory(this, this.announceRedoCallback, this.announceUndoCallback);
		this.toolController = new ToolController(this, this.localization);

		parent.appendChild(this.container);

		// Default to a 500x500 image
		this.importExportViewport.updateScreenSize(Vec2.of(500, 500));

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

	// Announce `message` for screen readers. If `message` is the same as the previous
	// message, it is re-announced.
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
	public addToolbar(defaultLayout: boolean = true): HTMLToolbar {
		const toolbar = new HTMLToolbar(this, this.container, this.localization);

		if (defaultLayout) {
			toolbar.addDefaultToolWidgets();
			toolbar.addDefaultActionButtons();
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
			if (!evt.ctrlKey) {
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

			if (evt.ctrlKey) {
				delta = Vec3.of(0, 0, evt.deltaY);
			}

			// Ensure that `pos` is relative to `this.container`
			const bbox = this.container.getBoundingClientRect();
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
		});

		window.addEventListener('resize', () => {
			this.notifier.dispatch(EditorEventType.DisplayResized, {
				kind: EditorEventType.DisplayResized,
				newSize: Vec2.of(
					this.display.width,
					this.display.height
				),
			});
			this.queueRerender();
		});

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
				const reader = new FileReader();

				this.showLoadingWarning(0);
				try {
					const data = await new Promise((resolve: (result: string|null)=>void, reject) => {
						reader.onload = () => resolve(reader.result as string|null);
						reader.onerror = reject;
						reader.onabort = reject;
						reader.onprogress = (evt) => {
							this.showLoadingWarning(evt.loaded / evt.total);
						};

						reader.readAsDataURL(file);
					});
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

	public handlePointerEventsFrom(elem: HTMLElement, filter?: HTMLPointerEventFilter) {
		// May be required to prevent text selection on iOS/Safari:
		// See https://stackoverflow.com/a/70992717/17055750
		elem.addEventListener('touchstart', evt => evt.preventDefault());
		elem.addEventListener('contextmenu', evt => {
			// Don't show a context menu
			evt.preventDefault();
		});

		const eventNames: HTMLPointerEventType[] = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
		for (const eventName of eventNames) {
			elem.addEventListener(eventName, evt => {
				if (filter && !filter(eventName, evt)) {
					return true;
				}

				return this.handleHTMLPointerEvent(eventName, evt);
			});
		}
	}

	/** Adds event listners for keypresses to `elem` and forwards those events to the editor. */
	public handleKeyEventsFrom(elem: HTMLElement) {
		elem.addEventListener('keydown', evt => {
			if (evt.key === 't' || evt.key === 'T') {
				evt.preventDefault();
				this.display.rerenderAsText();
			} else if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.KeyPressEvent,
				key: evt.key,
				ctrlKey: evt.ctrlKey,
				altKey: evt.altKey,
			})) {
				evt.preventDefault();
			} else if (evt.key === 'Escape') {
				this.renderingRegion.blur();
			}
		});

		elem.addEventListener('keyup', evt => {
			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.KeyUpEvent,
				key: evt.key,
				ctrlKey: evt.ctrlKey,
				altKey: evt.altKey,
			})) {
				evt.preventDefault();
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
		if (addToHistory) {
			// .push applies [command] to this
			this.history.push(command);
		} else {
			command.apply(this);
		}

		this.announceForAccessibility(command.description(this, this.localization));
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
		if (addToHistory) {
			this.history.push(command);
		} else {
			command.apply(this);
		}
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

	// @see {@link #asyncApplyOrUnapplyCommands }
	public asyncUnapplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, false, chunkSize);
	}

	private announceUndoCallback = (command: Command) => {
		this.announceForAccessibility(this.localization.undoAnnouncement(command.description(this, this.localization)));
	};

	private announceRedoCallback = (command: Command) => {
		this.announceForAccessibility(this.localization.redoAnnouncement(command.description(this, this.localization)));
	};

	private rerenderQueued: boolean = false;
	// Schedule a re-render for some time in the near future. Does not schedule an additional
	// re-render if a re-render is already queued.
	public queueRerender() {
		if (!this.rerenderQueued) {
			this.rerenderQueued = true;
			requestAnimationFrame(() => {
				this.rerender();
				this.rerenderQueued = false;
			});
		}
	}

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
				this.importExportViewport.visibleRect,
				exportRectStrokeWidth,
				exportRectFill
			);
		}

		this.rerenderQueued = false;
	}

	public drawWetInk(...path: RenderablePathSpec[]) {
		for (const part of path) {
			this.display.getWetInkRenderer().drawPath(part);
		}
	}

	public clearWetInk() {
		this.display.getWetInkRenderer().clear();
	}

	// Focuses the region used for text input/key commands.
	public focus() {
		this.renderingRegion.focus();
	}

	// Creates an element that will be positioned on top of the dry/wet ink
	// renderers.
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

	// Dispatch a keyboard event to the currently selected tool.
	// Intended for unit testing
	public sendKeyboardEvent(
		eventType: InputEvtType.KeyPressEvent|InputEvtType.KeyUpEvent,
		key: string,
		ctrlKey: boolean = false,
		altKey: boolean = false,
	) {
		this.toolController.dispatchInputEvent({
			kind: eventType,
			key,
			ctrlKey,
			altKey,
		});
	}

	// Dispatch a pen event to the currently selected tool.
	// Intended primarially for unit tests.
	public sendPenEvent(
		eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
		point: Point2,

		// @deprecated
		allPointers?: Pointer[]
	) {
		const mainPointer = Pointer.ofCanvasPoint(
			point, eventType !== InputEvtType.PointerUpEvt, this.viewport
		);
		this.toolController.dispatchInputEvent({
			kind: eventType,
			allPointers: allPointers ?? [
				mainPointer,
			],
			current: mainPointer,
		});
	}

	public toSVG(): SVGElement {
		const importExportViewport = this.importExportViewport;
		const svgNameSpace = 'http://www.w3.org/2000/svg';
		const result = document.createElementNS(svgNameSpace, 'svg');
		const renderer = new SVGRenderer(result, importExportViewport);

		const origTransform = importExportViewport.canvasToScreenTransform;
		// Reset the transform to ensure that (0, 0) is (0, 0)
		importExportViewport.resetTransform(Mat33.identity);

		// Render **all** elements.
		this.image.renderAll(renderer);

		importExportViewport.resetTransform(origTransform);

		// Just show the main region
		const rect = importExportViewport.visibleRect;
		result.setAttribute('viewBox', `${rect.x} ${rect.y} ${rect.w} ${rect.h}`);
		result.setAttribute('width', `${rect.w}`);
		result.setAttribute('height', `${rect.h}`);

		// Ensure the image can be identified as an SVG if downloaded.
		// See https://jwatt.org/svg/authoring/
		result.setAttribute('version', '1.1');
		result.setAttribute('baseProfile', 'full');
		result.setAttribute('xmlns', svgNameSpace);


		return result;
	}

	public async loadFrom(loader: ImageLoader) {
		this.showLoadingWarning(0);
		this.display.setDraftMode(true);

		await loader.start((component) => {
			this.dispatchNoAnnounce(EditorImage.addElement(component));
		}, (countProcessed: number, totalToProcess: number) => {
			if (countProcessed % 500 === 0) {
				this.showLoadingWarning(countProcessed / totalToProcess);
				this.rerender();
				return new Promise(resolve => {
					requestAnimationFrame(() => resolve());
				});
			}

			return null;
		}, (importExportRect: Rect2) => {
			this.dispatchNoAnnounce(this.setImportExportRect(importExportRect), false);
			this.dispatchNoAnnounce(this.viewport.zoomTo(importExportRect), false);
		});
		this.hideLoadingWarning();

		this.display.setDraftMode(false);
		this.queueRerender();
	}

	// Returns the size of the visible region of the output SVG
	public getImportExportRect(): Rect2 {
		return this.importExportViewport.visibleRect;
	}

	// Resize the output SVG to match `imageRect`.
	public setImportExportRect(imageRect: Rect2): Command {
		const origSize = this.importExportViewport.visibleRect.size;
		const origTransform = this.importExportViewport.canvasToScreenTransform;

		return new class extends Command {
			public apply(editor: Editor) {
				const viewport = editor.importExportViewport;
				viewport.updateScreenSize(imageRect.size);
				viewport.resetTransform(Mat33.translation(imageRect.topLeft.times(-1)));
				editor.queueRerender();
			}

			public unapply(editor: Editor) {
				const viewport = editor.importExportViewport;
				viewport.updateScreenSize(origSize);
				viewport.resetTransform(origTransform);
				editor.queueRerender();
			}

			public description(_editor: Editor, localizationTable: EditorLocalization) {
				return localizationTable.resizeOutputCommand(imageRect);
			}
		};
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
