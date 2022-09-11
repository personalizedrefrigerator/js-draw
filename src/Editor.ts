
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

export interface EditorSettings {
	// Defaults to RenderingMode.CanvasRenderer
	renderingMode: RenderingMode,

	// Uses a default English localization if a translation is not given.
	localization: Partial<EditorLocalization>,

	// True if touchpad/mousewheel scrolling should scroll the editor instead of the document.
	// This does not include pinch-zoom events.
	// Defaults to true.
	wheelEventsEnabled: boolean|'only-if-focused';

	minZoom: number,
	maxZoom: number,
}

export class Editor {
	// Wrapper around the viewport and toolbar
	private container: HTMLElement;
	private renderingRegion: HTMLElement;

	public history: UndoRedoHistory;
	public display: Display;
	public image: EditorImage;

	// Viewport for the exported/imported image
	private importExportViewport: Viewport;
	public localization: EditorLocalization;

	public viewport: Viewport;
	public toolController: ToolController;
	public notifier: EditorNotifier;

	private loadingWarning: HTMLElement;
	private accessibilityAnnounceArea: HTMLElement;
	private accessibilityControlArea: HTMLTextAreaElement;

	private settings: EditorSettings;

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

	// Returns a reference to this' container.
	// Example usage:
	//   editor.getRootElement().style.height = '500px';
	public getRootElement(): HTMLElement {
		return this.container;
	}

	// [fractionLoaded] should be a number from 0 to 1, where 1 represents completely loaded.
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
	public announceForAccessibility(message: string) {
		// Force re-announcing an announcement if announced again.
		if (message === this.previousAccessibilityAnnouncement) {
			message = message + '. ';
		}
		this.accessibilityAnnounceArea.innerText = message;
		this.previousAccessibilityAnnouncement = message;
	}

	public addToolbar(defaultLayout: boolean = true): HTMLToolbar {
		const toolbar = new HTMLToolbar(this, this.container, this.localization);

		if (defaultLayout) {
			toolbar.addDefaultToolWidgets();
			toolbar.addDefaultActionButtons();
		}

		return toolbar;
	}

	private registerListeners() {
		const pointers: Record<number, Pointer> = {};
		const getPointerList = () => {
			const nowTime = (new Date()).getTime();

			const res: Pointer[] = [];
			for (const id in pointers) {
				const maxUnupdatedTime = 2000; // Maximum time without a pointer update (ms)
				if (pointers[id] && (nowTime - pointers[id].timeStamp) < maxUnupdatedTime) {
					res.push(pointers[id]);
				}
			}
			return res;
		};

		// May be required to prevent text selection on iOS/Safari:
		// See https://stackoverflow.com/a/70992717/17055750
		this.renderingRegion.addEventListener('touchstart', evt => evt.preventDefault());
		this.renderingRegion.addEventListener('contextmenu', evt => {
			// Don't show a context menu
			evt.preventDefault();
		});

		this.renderingRegion.addEventListener('pointerdown', evt => {
			const pointer = Pointer.ofEvent(evt, true, this.viewport);
			pointers[pointer.id] = pointer;

			this.renderingRegion.setPointerCapture(pointer.id);
			const event: PointerEvt = {
				kind: InputEvtType.PointerDownEvt,
				current: pointer,
				allPointers: getPointerList(),
			};
			this.toolController.dispatchInputEvent(event);

			return true;
		});

		this.renderingRegion.addEventListener('pointermove', evt => {
			const pointer = Pointer.ofEvent(
				evt, pointers[evt.pointerId]?.down ?? false, this.viewport
			);
			if (pointer.down) {
				const prevData = pointers[pointer.id];

				if (prevData) {
					const distanceMoved = pointer.screenPos.minus(prevData.screenPos).magnitude();

					// If the pointer moved less than two pixels, don't send a new event.
					if (distanceMoved < 2) {
						return;
					}
				}

				pointers[pointer.id] = pointer;
				if (this.toolController.dispatchInputEvent({
					kind: InputEvtType.PointerMoveEvt,
					current: pointer,
					allPointers: getPointerList(),
				})) {
					evt.preventDefault();
				}
			}
		});

		const pointerEnd = (evt: PointerEvent) => {
			const pointer = Pointer.ofEvent(evt, false, this.viewport);
			if (!pointers[pointer.id]) {
				return;
			}

			pointers[pointer.id] = pointer;
			this.renderingRegion.releasePointerCapture(pointer.id);
			if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.PointerUpEvt,
				current: pointer,
				allPointers: getPointerList(),
			})) {
				evt.preventDefault();
			}
			delete pointers[pointer.id];
		};

		this.renderingRegion.addEventListener('pointerup', evt => {
			pointerEnd(evt);
		});

		this.renderingRegion.addEventListener('pointercancel', evt => {
			pointerEnd(evt);
		});

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

			const pos = Vec2.of(evt.offsetX, evt.offsetY);
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
	}

	// Adds event listners for keypresses to [elem] and forwards those events to the
	// editor.
	public handleKeyEventsFrom(elem: HTMLElement) {
		elem.addEventListener('keydown', evt => {
			if (evt.key === 't' || evt.key === 'T') {
				evt.preventDefault();
				this.display.rerenderAsText();
			} else if (this.toolController.dispatchInputEvent({
				kind: InputEvtType.KeyPressEvent,
				key: evt.key,
				ctrlKey: evt.ctrlKey,
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
			})) {
				evt.preventDefault();
			}
		});
	}

	// Adds to history by default
	public dispatch(command: Command, addToHistory: boolean = true) {
		if (addToHistory) {
			// .push applies [command] to this
			this.history.push(command);
		} else {
			command.apply(this);
		}

		this.announceForAccessibility(command.description(this, this.localization));
	}

	// Dispatches a command without announcing it. By default, does not add to history.
	public dispatchNoAnnounce(command: Command, addToHistory: boolean = false) {
		if (addToHistory) {
			this.history.push(command);
		} else {
			command.apply(this);
		}
	}

	// Apply a large transformation in chunks.
	// If [apply] is false, the commands are unapplied.
	// Triggers a re-render after each [updateChunkSize]-sized group of commands
	// has been applied.
	private async asyncApplyOrUnapplyCommands(
		commands: Command[], apply: boolean, updateChunkSize: number
	) {
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

	public asyncApplyCommands(commands: Command[], chunkSize: number) {
		return this.asyncApplyOrUnapplyCommands(commands, true, chunkSize);
	}

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

	// Focuses the region used for text input
	public focus() {
		this.renderingRegion.focus();
	}

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

	// Dispatch a pen event to the currently selected tool.
	// Intented for unit tests.
	public sendPenEvent(
		eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
		point: Point2,
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

	// Resize the output SVG
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

	// Alias for loadFrom(SVGLoader.fromString).
	// This is particularly useful when accessing a bundled version of the editor.
	public async loadFromSVG(svgData: string) {
		const loader = SVGLoader.fromString(svgData);
		await this.loadFrom(loader);
	}
}

export default Editor;
