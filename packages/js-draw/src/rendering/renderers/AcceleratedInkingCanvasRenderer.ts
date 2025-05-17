import { StrokeStyle } from '../RenderingStyle';
import { DraftInkPresenter } from './AbstractRenderer';
import CanvasRenderer from './CanvasRenderer';
import Viewport from '../../Viewport';

interface NavigatorInkTrailPresenter {
	updateInkTrailStartPoint(event: PointerEvent, style: { diameter: number; color: string }): void;
}

interface NavigatorInkApi {
	requestPresenter(options: { presentationArea: Element }): Promise<NavigatorInkTrailPresenter>;
}

class CanvasInkPresenter implements DraftInkPresenter {
	private enabled = new Map<number, boolean>();
	private presenter: NavigatorInkTrailPresenter | null = null;
	private style = { color: 'black', diameter: 2 };

	public constructor(
		canvas: HTMLCanvasElement,
		private viewport: Viewport,
	) {
		if ('ink' in navigator && navigator.ink) {
			const ink = navigator.ink as NavigatorInkApi;
			ink.requestPresenter({ presentationArea: canvas }).then((presenter) => {
				this.presenter = presenter;
			});
		}
	}

	public setEnabled(pointerId: number, enabled: boolean) {
		this.enabled.set(pointerId, enabled);
	}

	public updateStyle(style: StrokeStyle) {
		const colorString = style.color.toString();
		// style.diameter must be a postive integer.
		this.style = {
			color: colorString,
			diameter: Math.ceil(style.width / this.viewport.getSizeOfPixelOnCanvas()),
		};
	}

	public onEvent(event: PointerEvent) {
		if (this.presenter && this.enabled.get(event.pointerId) && event.isTrusted) {
			this.presenter.updateInkTrailStartPoint(event, this.style);
		}
	}
}

/** A canvas that uses the web ink API for accelerated inking. */
export default class AcceleratedInkingCanvasRenderer extends CanvasRenderer {
	private inkPresenter: CanvasInkPresenter;

	public constructor(ctx: CanvasRenderingContext2D, viewport: Viewport) {
		super(ctx, viewport);
		this.inkPresenter = new CanvasInkPresenter(ctx.canvas, viewport);
	}

	public override getDraftInkPresenter() {
		return this.inkPresenter;
	}

	public onEvent(event: PointerEvent) {
		this.inkPresenter.onEvent(event);
	}
}
