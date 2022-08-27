import { PathCommandType } from '../../geometry/Path';
import Rect2 from '../../geometry/Rect2';
import AbstractRenderer from '../../rendering/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';

export const makeArrowBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, _viewport: Viewport) => {
	return new ArrowBuilder(initialPoint);
};

export default class ArrowBuilder implements ComponentBuilder {
	private endPoint: StrokeDataPoint;

	public constructor(private readonly startPoint: StrokeDataPoint) {
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
		const startPoint = this.startPoint.pos;
		const endPoint = this.endPoint.pos;
		const toEnd = endPoint.minus(startPoint).normalized();
		const arrowLength = endPoint.minus(startPoint).length();

		// Ensure that the arrow tip is smaller than the arrow.
		const arrowTipSize = Math.min(this.getLineWidth(), arrowLength / 2);
		const startSize = this.startPoint.width / 2;
		const endSize = this.endPoint.width / 2;

		const arrowTipBase = endPoint.minus(toEnd.times(arrowTipSize));

		// Scaled normal vectors.
		const lineNormal = toEnd.orthog();
		const scaledStartNormal = lineNormal.times(startSize);
		const scaledBaseNormal = lineNormal.times(endSize);

		const preview = new Stroke([
			{
				startPoint: arrowTipBase.minus(scaledBaseNormal),
				commands: [
					// Stem
					{
						kind: PathCommandType.LineTo,
						point: startPoint.minus(scaledStartNormal),
					},
					{
						kind: PathCommandType.LineTo,
						point: startPoint.plus(scaledStartNormal),
					},
					{
						kind: PathCommandType.LineTo,
						point: arrowTipBase.plus(scaledBaseNormal),
					},

					// Head
					{
						kind: PathCommandType.LineTo,
						point: arrowTipBase.plus(lineNormal.times(arrowTipSize).plus(scaledBaseNormal))
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
				],
				style: {
					fill: this.startPoint.color,
				}
			}
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