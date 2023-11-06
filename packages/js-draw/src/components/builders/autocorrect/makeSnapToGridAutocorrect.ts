import { Rect2 } from '@js-draw/math';
import Viewport from '../../../Viewport';
import { StrokeDataPoint } from '../../../types';
import AbstractComponent from '../../AbstractComponent';
import { ComponentBuilder, ComponentBuilderFactory } from '../types';
import AbstractRenderer from '../../../rendering/renderers/AbstractRenderer';

const makeSnapToGridAutocorrect = (sourceFactory: ComponentBuilderFactory): ComponentBuilderFactory => {
	return (startPoint: StrokeDataPoint, viewport: Viewport) => {
		return new SnapToGridAutocompleteBuilder(sourceFactory, startPoint, viewport);
	};
};

export default makeSnapToGridAutocorrect;

class SnapToGridAutocompleteBuilder implements ComponentBuilder {
	private builder: ComponentBuilder;
	private points: StrokeDataPoint[];

	public constructor(
		private sourceFactory: ComponentBuilderFactory,
		private startPoint: StrokeDataPoint,
		private viewport: Viewport
	) {
		this.builder = sourceFactory(startPoint, viewport);
		this.points = [ startPoint ];
	}

	public getBBox(): Rect2 {
		return this.builder.getBBox();
	}

	public build(): AbstractComponent {
		return this.builder.build();
	}

	public preview(renderer: AbstractRenderer) {
		this.builder.preview(renderer);
	}

	public addPoint(point: StrokeDataPoint): void {
		this.points.push(point);
		this.builder.addPoint(point);
	}

	public async autocorrectShape() {
		const snapToGrid = (point: StrokeDataPoint) => {
			return {
				...point,
				pos: this.viewport.snapToGrid(point.pos),
			};
		};

		// Use screen points so that snapped shapes rotate with the screen.
		const startPoint = snapToGrid(this.startPoint);
		const builder = this.sourceFactory(startPoint, this.viewport);

		const points = this.points.map(point => snapToGrid(point));
		for (const point of points) {
			builder.addPoint(point);
		}

		return builder.build();
	}
}
