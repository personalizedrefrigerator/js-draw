import AbstractRenderer from './renderers/AbstractRenderer';
import CanvasRenderer from './renderers/CanvasRenderer';
import { Editor } from '../Editor';
import { EditorEventType } from '../types';
import DummyRenderer from './renderers/DummyRenderer';
import { Point2, Vec2 } from '../math/Vec2';
import RenderingCache from './caching/RenderingCache';
import TextOnlyRenderer from './renderers/TextOnlyRenderer';
import Color4 from '../Color4';

export enum RenderingMode {
	DummyRenderer,
	CanvasRenderer,
	// SVGRenderer is not supported by the main display
}

export default class Display {
	private dryInkRenderer: AbstractRenderer;
	private wetInkRenderer: AbstractRenderer;
	private textRenderer: TextOnlyRenderer;
	private textRerenderOutput: HTMLElement|null = null;
	private cache: RenderingCache;
	private resizeSurfacesCallback?: ()=> void;
	private flattenCallback?: ()=> void;

	public constructor(
		private editor: Editor, mode: RenderingMode, private parent: HTMLElement|null
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
			cacheSize: 500 * 500 * 4 * 150,
			maxScale: 1.5,
			minComponentsPerCache: 45,
			minComponentsToUseCache: 105,
		});

		this.editor.notifier.on(EditorEventType.DisplayResized, event => {
			if (event.kind !== EditorEventType.DisplayResized) {
				throw new Error('Mismatched event.kinds!');
			}

			this.resizeSurfacesCallback?.();
		});
	}

	// Returns the visible width of the display (e.g. how much
	// space the display's element takes up in the x direction
	// in the DOM).
	public get width(): number {
		return this.dryInkRenderer.displaySize().x;
	}

	public get height(): number {
		return this.dryInkRenderer.displaySize().y;
	}

	public getCache() {
		return this.cache;
	}

	public getColorAt = (_screenPos: Point2): Color4|null => {
		return null;
	};

	private initializeCanvasRendering() {
		const dryInkCanvas = document.createElement('canvas');
		const wetInkCanvas = document.createElement('canvas');
		const dryInkCtx = dryInkCanvas.getContext('2d')!;
		const wetInkCtx = wetInkCanvas.getContext('2d')!;

		this.dryInkRenderer = new CanvasRenderer(dryInkCtx, this.editor.viewport);
		this.wetInkRenderer = new CanvasRenderer(wetInkCtx, this.editor.viewport);

		dryInkCanvas.className = 'dryInkCanvas';
		wetInkCanvas.className = 'wetInkCanvas';

		if (this.parent) {
			this.parent.appendChild(dryInkCanvas);
			this.parent.appendChild(wetInkCanvas);
		}

		this.resizeSurfacesCallback = () => {
			const hasSizeMismatch = (canvas: HTMLCanvasElement): boolean => {
				return canvas.clientHeight !== canvas.height || canvas.clientWidth !== canvas.width;
			};

			// Ensure that the drawing surfaces sizes match the
			// canvas' sizes to prevent stretching.
			if (hasSizeMismatch(dryInkCanvas) || hasSizeMismatch(wetInkCanvas)) {
				dryInkCanvas.width = dryInkCanvas.clientWidth;
				dryInkCanvas.height = dryInkCanvas.clientHeight;
				wetInkCanvas.width = wetInkCanvas.clientWidth;
				wetInkCanvas.height = wetInkCanvas.clientHeight;

				this.editor.notifier.dispatch(EditorEventType.DisplayResized, {
					kind: EditorEventType.DisplayResized,
					newSize: Vec2.of(
						this.width,
						this.height,
					),
				});
			}
		};
		this.resizeSurfacesCallback();

		this.flattenCallback = () => {
			dryInkCtx.drawImage(wetInkCanvas, 0, 0);
		};

		this.getColorAt = (screenPos: Point2) => {
			const pixel = dryInkCtx.getImageData(screenPos.x, screenPos.y, 1, 1);
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

	public rerenderAsText() {
		this.textRenderer.clear();
		this.editor.image.render(this.textRenderer, this.editor.viewport);
		
		if (this.textRerenderOutput) {
			this.textRerenderOutput.innerText = this.textRenderer.getDescription();
		}
	}

	// Clears the drawing surfaces and otherwise prepares for a rerender.
	public startRerender(): AbstractRenderer {
		this.resizeSurfacesCallback?.();
		this.wetInkRenderer.clear();
		this.dryInkRenderer.clear();

		return this.dryInkRenderer;
	}

	public setDraftMode(draftMode: boolean) {
		this.dryInkRenderer.setDraftMode(draftMode);
	}

	public getDryInkRenderer(): AbstractRenderer {
		return this.dryInkRenderer;
	}

	public getWetInkRenderer(): AbstractRenderer {
		return this.wetInkRenderer;
	}

	// Re-renders the contents of the wetInkRenderer onto the dryInkRenderer
	public flatten() {
		this.flattenCallback?.();
	}
}
