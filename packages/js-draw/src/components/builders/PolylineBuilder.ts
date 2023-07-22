import { Vec2 } from '../../math/Vec2';
import Path, { PathCommand, PathCommandType } from '../../math/shapes/Path';
import Rect2 from '../../math/shapes/Rect2';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import Color4 from '../../Color4';

// While a `PolylineBuilder` can use a large amount of output memory, it can be helpful for debugging.
export const makePolylineBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, viewport: Viewport) => {
	return new PolylineBuilder(initialPoint, viewport);
};

class PolylineBuilder implements ComponentBuilder {
	private points: StrokeDataPoint[] = [];

	public constructor(
		private readonly startPoint: StrokeDataPoint,
		private readonly viewport: Viewport,
	) {
	}

	public getBBox(): Rect2 {
		const preview = this.buildPreview();
		return preview.getBBox();
	}

	private buildPreview(): Stroke {
		const points = [];
		//let maxWidth = this.startPoint.width;

		for (let i = 0; i < this.points.length; i++) {
			const point = this.points[i];
			points.push(point.pos.plus(Vec2.of(0, point.width / 2.5)));
		}

		for (let i = this.points.length - 1; i >= 0; i--) {
			const point = this.points[i];
			points.push(point.pos.plus(Vec2.of(0, -point.width / 2.5)));
			//maxWidth = Math.max(point.width, maxWidth);
		}

		const pathCommands: PathCommand[] = points.map(point => {
			return {
				kind: PathCommandType.LineTo,
				point: point,
			};
		});

		const path = new Path(this.startPoint.pos, pathCommands)
			.mapPoints(point => this.viewport.roundPoint(point));

		// Round the stroke width so that when exported it doesn't have unnecessary trailing decimals.
		//maxWidth = Viewport.roundPoint(maxWidth, 5 / this.viewport.getScaleFactor());

		const preview = new Stroke([
			path.toRenderable({
				fill: Color4.transparent,
				stroke: {
					width: 1,
					color: this.startPoint.color,
				},
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
		this.points.push(point);
	}
}
export default PolylineBuilder;
