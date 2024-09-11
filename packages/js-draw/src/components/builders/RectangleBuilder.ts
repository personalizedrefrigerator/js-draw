import { Mat33, Rect2, Path } from '@js-draw/math';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { pathToRenderable } from '../../rendering/RenderablePathSpec';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import makeSnapToGridAutocorrect from './autocorrect/makeSnapToGridAutocorrect';

export const makeFilledRectangleBuilder: ComponentBuilderFactory = makeSnapToGridAutocorrect(
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		return new RectangleBuilder(initialPoint, true, viewport);
	},
);

export const makeOutlinedRectangleBuilder: ComponentBuilderFactory = makeSnapToGridAutocorrect(
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		return new RectangleBuilder(initialPoint, false, viewport);
	},
);

export default class RectangleBuilder implements ComponentBuilder {
	private endPoint: StrokeDataPoint;

	public constructor(
		private readonly startPoint: StrokeDataPoint,
		private filled: boolean,
		private viewport: Viewport,
	) {
		// Initially, the start and end points are the same.
		this.endPoint = startPoint;
	}

	public getBBox(): Rect2 {
		const preview = this.buildPreview();
		return preview.getBBox();
	}

	private buildPreview(): Stroke {
		const canvasAngle = this.viewport.getRotationAngle();
		const rotationMat = Mat33.zRotation(-canvasAngle);

		// Adjust startPoint and endPoint such that applying [rotationMat] to them
		// brings them to this.startPoint and this.endPoint.
		const startPoint = rotationMat.inverse().transformVec2(this.startPoint.pos);
		const endPoint = rotationMat.inverse().transformVec2(this.endPoint.pos);

		const rect = Rect2.fromCorners(startPoint, endPoint);
		const path = Path.fromRect(rect, this.filled ? null : this.endPoint.width)
			.transformedBy(
				// Rotate the canvas rectangle so that its rotation matches the screen
				rotationMat,
			)
			.mapPoints((point) => this.viewport.roundPoint(point));

		const preview = new Stroke([
			pathToRenderable(path, {
				fill: this.endPoint.color,
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
