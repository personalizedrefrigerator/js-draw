import { PathCommandType } from '../../geometry/Path';
import Rect2 from '../../geometry/Rect2';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import Stroke from '../Stroke';
import { ComponentBuilder, ComponentBuilderFactory } from './types';

export const makeLineBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, _viewport: Viewport) => {
	return new LineBuilder(initialPoint);
};

export default class LineBuilder implements ComponentBuilder {
	private endPoint: StrokeDataPoint;

	public constructor(private readonly startPoint: StrokeDataPoint) {
		this.endPoint = startPoint;
	}

	public getBBox(): Rect2 {
		const preview = this.buildPreview();
		return preview.getBBox();
	}

	private buildPreview(): Stroke {
		const startPoint = this.startPoint.pos;
		const endPoint = this.endPoint.pos;
		const toEnd = endPoint.minus(startPoint).normalized();

		const startSize = this.startPoint.width / 2;
		const endSize = this.endPoint.width / 2;

		const lineNormal = toEnd.orthog();
		const scaledStartNormal = lineNormal.times(startSize);
		const scaledEndNormal = lineNormal.times(endSize);

		const preview = new Stroke([
			{
				startPoint: startPoint.minus(scaledStartNormal),
				commands: [
					{
						kind: PathCommandType.LineTo,
						point: startPoint.plus(scaledStartNormal),
					},
					{
						kind: PathCommandType.LineTo,
						point: endPoint.plus(scaledEndNormal),
					},
					{
						kind: PathCommandType.LineTo,
						point: endPoint.minus(scaledEndNormal),
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