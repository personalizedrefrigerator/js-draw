import { Path, PathCommandType, Rect2 } from '@js-draw/math';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import makeSnapToGridAutocorrect from './autocorrect/makeSnapToGridAutocorrect';

export const makeArrowBuilder: ComponentBuilderFactory = makeSnapToGridAutocorrect(
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		return new ArrowBuilder(initialPoint, viewport);
	},
);

export default class ArrowBuilder implements ComponentBuilder {
	private endPoint: StrokeDataPoint;

	public constructor(
		private readonly startPoint: StrokeDataPoint,
		private readonly viewport: Viewport,
	) {
		this.endPoint = startPoint;
	}

	private getLineWidth(): number {
		return Math.max(this.endPoint.width, this.startPoint.width);
	}

	public getBBox(): Rect2 {
		const preview = this.buildPreview();
		return preview.getBBox();
	}

	private buildPreview(): Stroke {
		const lineStartPoint = this.startPoint.pos;
		const endPoint = this.endPoint.pos;
		const toEnd = endPoint.minus(lineStartPoint).normalized();
		const arrowLength = endPoint.distanceTo(lineStartPoint);

		// Ensure that the arrow tip is smaller than the arrow.
		const arrowTipSize = Math.min(this.getLineWidth(), arrowLength / 2);
		const startSize = this.startPoint.width / 2;
		const endSize = this.endPoint.width / 2;

		const arrowTipBase = endPoint.minus(toEnd.times(arrowTipSize));

		// Scaled normal vectors.
		const lineNormal = toEnd.orthog();
		const scaledStartNormal = lineNormal.times(startSize);
		const scaledBaseNormal = lineNormal.times(endSize);

		const path = new Path(arrowTipBase.minus(scaledBaseNormal), [
			// Stem
			{
				kind: PathCommandType.LineTo,
				point: lineStartPoint.minus(scaledStartNormal),
			},
			{
				kind: PathCommandType.LineTo,
				point: lineStartPoint.plus(scaledStartNormal),
			},
			{
				kind: PathCommandType.LineTo,
				point: arrowTipBase.plus(scaledBaseNormal),
			},

			// Head
			{
				kind: PathCommandType.LineTo,
				point: arrowTipBase.plus(lineNormal.times(arrowTipSize).plus(scaledBaseNormal)),
			},
			{
				kind: PathCommandType.LineTo,
				point: endPoint.plus(toEnd.times(endSize)),
			},
			{
				kind: PathCommandType.LineTo,
				point: arrowTipBase.plus(lineNormal.times(-arrowTipSize).minus(scaledBaseNormal)),
			},
			{
				kind: PathCommandType.LineTo,
				point: arrowTipBase.minus(scaledBaseNormal),
			},
			// Round all points in the arrow (to remove unnecessary decimal places)
		]).mapPoints((point) => this.viewport.roundPoint(point));

		const preview = new Stroke([
			{
				startPoint: path.startPoint,
				commands: path.parts,
				style: {
					fill: this.startPoint.color,
				},
			},
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
