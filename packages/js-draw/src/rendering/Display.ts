import AbstractRenderer from './renderers/AbstractRenderer';
import CanvasRenderer from './renderers/CanvasRenderer';
import { Editor } from '../Editor';
import { EditorEventType } from '../types';
import DummyRenderer from './renderers/DummyRenderer';
import { Point2, Vec2, Color4 } from '@js-draw/math';
import RenderingCache from './caching/RenderingCache';
import TextOnlyRenderer from './renderers/TextOnlyRenderer';
import AcceleratedInkingCanvasRenderer from './renderers/AcceleratedInkingCanvasRenderer';

export enum RenderingMode {
	DummyRenderer,
	CanvasRenderer,
	// SVGRenderer is not supported by the main display
}

/**
 * Handles `HTMLCanvasElement`s (or other drawing surfaces if being used) used to display the editor's contents.
 *
 * @example
 * ```
 * const editor = new Editor(document.body);
 * const w = editor.display.width;
 * const h = editor.display.height;
 * const center = Vec2.of(w / 2, h / 2);
 * const colorAtCenter = editor.display.getColorAt(center);
 * ```
 */
export default class Display {
	private dryInkRenderer: AbstractRenderer;
	private wetInkRenderer: AbstractRenderer;
	private textRenderer: TextOnlyRenderer;
	private textRerenderOutput: HTMLElement | null = null;
	private cache: RenderingCache;
	private devicePixelRatio: number = window.devicePixelRatio ?? 1;
	private resizeSurfacesCallback?: () => void;
	private flattenCallback?: () => void;

	/** @internal */
	public constructor(
		private editor: Editor,
		mode: RenderingMode,
		private parent: HTMLElement | null,
	) {
		if (mode === RenderingMode.CanvasRenderer) {
			this.initializeCanvasRendering();
		} else if (mode === RenderingMode.DummyRenderer) {
			this.dryInkRenderer = new DummyRenderer(editor.viewport);
			this.wetInkRenderer = new DummyRenderer(editor.viewport);
		} else {
			throw new Error(`Unknown rendering mode, ${mode}!`);
		}

		this.textRenderer = new TextOnlyRenderer(editor.viewport, editor.localization);
		this.initializeTextRendering();

		const cacheBlockResolution = Vec2.of(600, 600);
		this.cache = new RenderingCache({
			createRenderer: () => {
				if (mode === RenderingMode.DummyRenderer) {
					return new DummyRenderer(editor.viewport);
				} else if (mode !== RenderingMode.CanvasRenderer) {
					throw new Error('Unspported rendering mode');
				}

				// Make the canvas slightly larger than each cache block to prevent
				// seams.
				const canvas = document.createElement('canvas');
				canvas.width = cacheBlockResolution.x + 1;
				canvas.height = cacheBlockResolution.y + 1;
				const ctx = canvas.getContext('2d');

				return new CanvasRenderer(ctx!, editor.viewport);
			},
			isOfCorrectType: (renderer) => {
				return this.dryInkRenderer.canRenderFromWithoutDataLoss(renderer);
			},
			blockResolution: cacheBlockResolution,
			cacheSize: 600 * 600 * 4 * 90,

			// On higher resolution displays, don't scale cache blocks as much to decrease blurriness.
			// TODO: Decrease the minimum cache scale as well.
			maxScale: Math.max(1, 1.3 / window.devicePixelRatio),

			// Require about 20 strokes with 4 parts each to cache an image in one of the
			// parts of the cache grid.
			minProportionalRenderTimePerCache: 20 * 4,

			// Require about 105 strokes with 4 parts each to use the cache at all.
			minProportionalRenderTimeToUseCache: 105 * 4,
		});

		this.editor.notifier.on(EditorEventType.DisplayResized, (event) => {
			if (event.kind !== EditorEventType.DisplayResized) {
				throw new Error('Mismatched event.kinds!');
			}

			this.resizeSurfacesCallback?.();
		});
	}

	/**
	 * @returns the visible width of the display (e.g. how much
	 * space the display's element takes up in the x direction
	 * in the DOM).
	 */
	public get width(): number {
		return this.dryInkRenderer.displaySize().x;
	}

	/** @returns the visible height of the display. See {@link width}. */
	public get height(): number {
		return this.dryInkRenderer.displaySize().y;
	}

	/** @internal */
	public getCache() {
		return this.cache;
	}

	/**
	 * @returns the color at the given point on the dry ink renderer, or `null` if `screenPos`
	 * 	is not on the display.
	 */
	public getColorAt = (_screenPos: Point2): Color4 | null => {
		return null;
	};

	private initializeCanvasRendering() {
		const dryInkCanvas = document.createElement('canvas');
		const wetInkCanvas = document.createElement('canvas');
		const dryInkCtx = dryInkCanvas.getContext('2d')!;
		const wetInkCtx = wetInkCanvas.getContext('2d')!;

		this.dryInkRenderer = new CanvasRenderer(dryInkCtx, this.editor.viewport);
		this.wetInkRenderer = new AcceleratedInkingCanvasRenderer(wetInkCtx, this.editor.viewport);

		dryInkCanvas.className = 'dryInkCanvas';
		wetInkCanvas.className = 'wetInkCanvas';

		if (this.parent) {
			this.parent.appendChild(dryInkCanvas);
			this.parent.appendChild(wetInkCanvas);
		}

		this.resizeSurfacesCallback = () => {
			const expectedWidth = (canvas: HTMLCanvasElement): number => {
				const widthInPixels = Math.ceil(canvas.clientWidth * this.devicePixelRatio);
				// Avoid setting the canvas width to zero -- doing so can cause errors when attempting
				// to use the canvas:
				return widthInPixels || canvas.width;
			};
			const expectedHeight = (canvas: HTMLCanvasElement): number => {
				const heightInPixels = Math.ceil(canvas.clientHeight * this.devicePixelRatio);
				return heightInPixels || canvas.height; // Zero-size canvases can cause errors.
			};

			const hasSizeMismatch = (canvas: HTMLCanvasElement): boolean => {
				return expectedHeight(canvas) !== canvas.height || expectedWidth(canvas) !== canvas.width;
			};

			// Ensure that the drawing surfaces sizes match the
			// canvas' sizes to prevent stretching.
			if (hasSizeMismatch(dryInkCanvas) || hasSizeMismatch(wetInkCanvas)) {
				dryInkCanvas.width = expectedWidth(dryInkCanvas);
				dryInkCanvas.height = expectedHeight(dryInkCanvas);
				wetInkCanvas.width = expectedWidth(wetInkCanvas);
				wetInkCanvas.height = expectedHeight(wetInkCanvas);

				// Ensure correct drawing operations on high-resolution screens.
				// See
				// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#scaling_for_high_resolution_displays
				//
				// This scaling causes the rendering contexts to automatically convert
				// between screen coordinates and pixel coordinates.
				wetInkCtx.resetTransform();
				dryInkCtx.resetTransform();
				dryInkCtx.scale(this.devicePixelRatio, this.devicePixelRatio);
				wetInkCtx.scale(this.devicePixelRatio, this.devicePixelRatio);

				this.editor.notifier.dispatch(EditorEventType.DisplayResized, {
					kind: EditorEventType.DisplayResized,
					newSize: Vec2.of(this.width, this.height),
				});
			}
		};
		this.resizeSurfacesCallback();

		this.flattenCallback = () => {
			dryInkCtx.save();
			dryInkCtx.resetTransform();
			dryInkCtx.drawImage(wetInkCanvas, 0, 0);
			dryInkCtx.restore();
		};

		this.getColorAt = (screenPos: Point2) => {
			// getImageData isn't affected by a transformation matrix -- we need to
			// pre-transform screenPos to convert it from screen coordinates into pixel
			// coordinates.
			const adjustedScreenPos = screenPos.times(this.devicePixelRatio);
			const pixel = dryInkCtx.getImageData(adjustedScreenPos.x, adjustedScreenPos.y, 1, 1);
			const data = pixel?.data;

			if (data) {
				const color = Color4.ofRGBA(data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255);
				return color;
			}
			return null;
		};
	}

	private initializeTextRendering() {
		const textRendererOutputContainer = document.createElement('div');
		textRendererOutputContainer.classList.add('textRendererOutputContainer');

		const rerenderButton = document.createElement('button');
		rerenderButton.classList.add('rerenderButton');
		rerenderButton.innerText = this.editor.localization.rerenderAsText;

		this.textRerenderOutput = document.createElement('div');
		this.textRerenderOutput.setAttribute('aria-live', 'polite');

		rerenderButton.onclick = () => {
			this.rerenderAsText();
		};

		textRendererOutputContainer.replaceChildren(rerenderButton, this.textRerenderOutput);
		this.editor.createHTMLOverlay(textRendererOutputContainer);
	}

	/**
	 * Sets the device-pixel-ratio.
	 *
	 * Intended for debugging. Users do not need to call this manually.
	 *
	 * @internal
	 */
	public setDevicePixelRatio(dpr: number) {
		const minDpr = 0.001;
		const maxDpr = 10;
		if (isFinite(dpr) && dpr >= minDpr && dpr <= maxDpr && dpr !== this.devicePixelRatio) {
			this.devicePixelRatio = dpr;
			this.resizeSurfacesCallback?.();

			return this.editor.queueRerender();
		}

		return undefined;
	}

	/** @internal */
	public getDevicePixelRatio() {
		return this.devicePixelRatio;
	}

	/** @internal -- used for internal performance improvements. */
	public onPointerEvent(event: PointerEvent) {
		if (this.wetInkRenderer instanceof AcceleratedInkingCanvasRenderer) {
			this.wetInkRenderer.onEvent(event);
		}
	}

	/**
	 * Rerenders the text-based display.
	 * The text-based display is intended for screen readers and can be navigated to by pressing `tab`.
	 */
	public rerenderAsText() {
		this.textRenderer.clear();
		this.editor.image.render(this.textRenderer, this.editor.viewport);

		if (this.textRerenderOutput) {
			this.textRerenderOutput.innerText = this.textRenderer.getDescription();
		}
	}

	/**
	 * Clears the main drawing surface and otherwise prepares for a rerender.
	 *
	 * @returns the dry ink renderer.
	 */
	public startRerender(): AbstractRenderer {
		this.resizeSurfacesCallback?.();
		this.dryInkRenderer.clear();

		return this.dryInkRenderer;
	}

	/**
	 * If `draftMode`, the dry ink renderer is configured to render
	 * low-quality output.
	 */
	public setDraftMode(draftMode: boolean) {
		this.dryInkRenderer.setDraftMode(draftMode);
	}

	/** @internal */
	public getDryInkRenderer(): AbstractRenderer {
		return this.dryInkRenderer;
	}

	/**
	 * @returns The renderer used for showing action previews (e.g. an unfinished stroke).
	 * The `wetInkRenderer`'s surface is stacked above the `dryInkRenderer`'s.
	 */
	public getWetInkRenderer(): AbstractRenderer {
		return this.wetInkRenderer;
	}

	/** Re-renders the contents of the wetInkRenderer onto the dryInkRenderer. */
	public flatten() {
		this.flattenCallback?.();
	}
}
