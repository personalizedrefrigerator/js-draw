import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import RenderablePathSpec from '../../rendering/RenderablePathSpec';
import {
	Point2,
	Rect2,
	Color4,
	PathCommand,
	PathCommandType,
	Vec2,
	LineSegment2,
} from '@js-draw/math';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';
import makeShapeFitAutocorrect from './autocorrect/makeShapeFitAutocorrect';

/**
 * Creates a freehand line builder that creates strokes from line segments
 * rather than Bézier curves.
 *
 * Example:
 * [[include:doc-pages/inline-examples/changing-pen-types.md]]
 */
export const makePolylineBuilder: ComponentBuilderFactory = makeShapeFitAutocorrect(
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		// Fit to a value slightly smaller than the pixel size. A larger value can
		// cause the stroke to appear jagged at some zoom levels.
		const minFit = viewport.getSizeOfPixelOnCanvas() * 0.65;
		return new PolylineBuilder(initialPoint, minFit, viewport);
	},
);

export default class PolylineBuilder implements ComponentBuilder {
	private parts: PathCommand[] = [];

	private bbox: Rect2;
	private averageWidth: number;
	private widthAverageNumSamples: number = 1;

	private lastPoint: Point2;
	private startPoint: StrokeDataPoint;
	private lastLineSegment: LineSegment2 | null = null;

	public constructor(
		startPoint: StrokeDataPoint,
		private minFitAllowed: number,
		private viewport: Viewport,
	) {
		this.averageWidth = startPoint.width;

		this.startPoint = {
			...startPoint,
			pos: this.roundPoint(startPoint.pos),
		};
		this.lastPoint = this.startPoint.pos;
		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
		this.parts = [
			{
				kind: PathCommandType.MoveTo,
				point: this.startPoint.pos,
			},
		];
	}

	public getBBox(): Rect2 {
		return this.bbox.grownBy(this.averageWidth);
	}

	protected getRenderingStyle(): RenderingStyle {
		return {
			fill: Color4.transparent,
			stroke: {
				color: this.startPoint.color,
				width: this.roundDistance(this.averageWidth),
			},
		};
	}

	protected previewCurrentPath(): RenderablePathSpec {
		const startPoint = this.startPoint.pos;
		const commands = [...this.parts];

		// TODO: For now, this is necesary for the path to be visible.
		if (commands.length <= 1) {
			commands.push({
				kind: PathCommandType.LineTo,
				point: startPoint.plus(Vec2.of(this.averageWidth / 4, 0)),
			});
		}

		return {
			startPoint,

			commands,
			style: this.getRenderingStyle(),
		};
	}

	protected previewFullPath(): RenderablePathSpec[] {
		return [this.previewCurrentPath()];
	}

	public preview(renderer: AbstractRenderer) {
		const paths = this.previewFullPath();
		if (paths) {
			const approxBBox = this.viewport.visibleRect;
			renderer.startObject(approxBBox);
			for (const path of paths) {
				renderer.drawPath(path);
			}
			renderer.endObject();
		}
	}

	public build(): Stroke {
		return new Stroke(this.previewFullPath());
	}

	private getMinFit(): number {
		let minFit = Math.min(this.minFitAllowed, this.averageWidth / 4);

		if (minFit < 1e-10) {
			minFit = this.minFitAllowed;
		}

		return minFit;
	}

	private roundPoint(point: Point2): Point2 {
		const minFit = this.getMinFit();
		return Viewport.roundPoint(point, minFit);
	}

	private roundDistance(dist: number): number {
		const minFit = this.getMinFit();
		return Viewport.roundPoint(dist, minFit);
	}

	public addPoint(newPoint: StrokeDataPoint) {
		this.widthAverageNumSamples++;
		this.averageWidth =
			(this.averageWidth * (this.widthAverageNumSamples - 1)) / this.widthAverageNumSamples +
			newPoint.width / this.widthAverageNumSamples;

		const roundedPoint = this.roundPoint(newPoint.pos);

		if (!roundedPoint.eq(this.lastPoint)) {
			// If almost exactly in the same line as the previous
			if (
				this.lastLineSegment &&
				this.lastLineSegment.direction.dot(roundedPoint.minus(this.lastPoint).normalized()) > 0.997
			) {
				this.parts.pop();
				this.lastPoint = this.lastLineSegment.p1;
			}

			this.parts.push({
				kind: PathCommandType.LineTo,
				point: this.roundPoint(newPoint.pos),
			});

			this.bbox = this.bbox.grownToPoint(roundedPoint);
			this.lastLineSegment = new LineSegment2(this.lastPoint, roundedPoint);
			this.lastPoint = roundedPoint;
		}
	}
}
