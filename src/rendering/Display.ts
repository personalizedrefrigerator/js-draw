import AbstractRenderer from './renderers/AbstractRenderer';
import CanvasRenderer from './renderers/CanvasRenderer';
import { Editor } from '../Editor';
import { EditorEventType } from '../types';
import DummyRenderer from './renderers/DummyRenderer';
import { Vec2 } from '../geometry/Vec2';
import RenderingCache from './caching/RenderingCache';

export enum RenderingMode {
	DummyRenderer,
	CanvasRenderer,
	// SVGRenderer is not supported by the main display
}

export default class Display {
	private dryInkRenderer: AbstractRenderer;
	private wetInkRenderer: AbstractRenderer;
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

		const cacheBlockResolution = Vec2.of(500, 500);
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
			cacheSize: 500 * 500 * 4 * 200,
			maxScale: 1.4,
			minComponentsPerCache: 10,
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
