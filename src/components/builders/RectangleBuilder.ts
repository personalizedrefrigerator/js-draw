import Path from '../../geometry/Path';
import Rect2 from '../../geometry/Rect2';
import AbstractRenderer from '../../rendering/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';

export const makeFilledRectangleBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, _viewport: Viewport) => {
	return new RectangleBuilder(initialPoint, true);
};

export const makeOutlinedRectangleBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, _viewport: Viewport) => {
	return new RectangleBuilder(initialPoint, false);
};

export default class RectangleBuilder implements ComponentBuilder {
	private endPoint: StrokeDataPoint;

	public constructor(private readonly startPoint: StrokeDataPoint, private filled: boolean) {
		// Initially, the start and end points are the same.
		this.endPoint = startPoint;
	}

	public getBBox(): Rect2 {
		const preview = this.buildPreview();
		return preview.getBBox();
	}

	private buildPreview(): Stroke {
		const startPoint = this.startPoint.pos;
		const endPoint = this.endPoint.pos;
		const path = Path.fromRect(
			Rect2.fromCorners(startPoint, endPoint),
			this.filled ? null : this.endPoint.width,
		);

		const preview = new Stroke([
			path.toRenderable({
				fill: this.endPoint.color
			}),
		]);

		return preview;
	}

	public build(): AbstractComponent {
		return this.buildPreview();
	}

	public preview(renderer: AbstractRenderer): void {
		this.buildPreview().render(renderer);
	}

	public addPoint(point: StrokeDataPoint): void {
		this.endPoint = point;
	}
}