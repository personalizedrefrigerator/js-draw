import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import RenderablePathSpec from '../../rendering/RenderablePathSpec';
import { Point2, Vec2, Rect2, Color4, PathCommand, PathCommandType } from '@js-draw/math';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';
import { StrokeSmoother, Curve } from '../util/StrokeSmoother';
import makeShapeFitAutocorrect from './autocorrect/makeShapeFitAutocorrect';

/**
 * Creates a stroke builder that draws freehand lines.
 *
 * Example:
 * [[include:doc-pages/inline-examples/changing-pen-types.md]]
 */
export const makeFreehandLineBuilder: ComponentBuilderFactory = makeShapeFitAutocorrect(
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		// Don't smooth if input is more than ± 3 pixels from the true curve, do smooth if
		// less than ±1 px from the curve.
		const maxSmoothingDist = viewport.getSizeOfPixelOnCanvas() * 3;
		const minSmoothingDist = viewport.getSizeOfPixelOnCanvas();

		return new FreehandLineBuilder(initialPoint, minSmoothingDist, maxSmoothingDist, viewport);
	},
);

// Handles stroke smoothing and creates Strokes from user/stylus input.
export default class FreehandLineBuilder implements ComponentBuilder {
	private isFirstSegment: boolean = true;
	private parts: PathCommand[] = [];

	private curveFitter: StrokeSmoother;

	private bbox: Rect2;
	private averageWidth: number;
	private widthAverageNumSamples: number = 1;

	public constructor(
		private startPoint: StrokeDataPoint,

		private minFitAllowed: number,
		maxFitAllowed: number,

		private viewport: Viewport,
	) {
		this.curveFitter = new StrokeSmoother(
			startPoint,
			minFitAllowed,
			maxFitAllowed,
			(curve: Curve | null) => this.addCurve(curve),
		);

		this.averageWidth = startPoint.width;
		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	protected getRenderingStyle(): RenderingStyle {
		return {
			fill: Color4.transparent,
			stroke: this.inkTrailStyle(),
		};
	}

	public inkTrailStyle() {
		return {
			color: this.startPoint.color,
			width: this.roundDistance(this.averageWidth),
		};
	}

	protected previewCurrentPath(): RenderablePathSpec | null {
		const path = this.parts.slice();
		const commands = [...path, ...this.curveToPathCommands(this.curveFitter.preview())];
		const startPoint = this.startPoint.pos;

		return {
			startPoint,

			commands,
			style: this.getRenderingStyle(),
		};
	}

	protected previewFullPath(): RenderablePathSpec[] | null {
		const preview = this.previewCurrentPath();
		if (preview) {
			return [preview];
		}
		return null;
	}

	private previewStroke(): Stroke | null {
		const pathPreview = this.previewFullPath();

		if (pathPreview) {
			return new Stroke(pathPreview);
		}
		return null;
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
		this.curveFitter.finalizeCurrentCurve();
		return this.previewStroke()!;
	}

	private getMinFit(): number {
		let minFit = Math.min(this.minFitAllowed, this.averageWidth / 3);

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

	private curveToPathCommands(curve: Curve | null): PathCommand[] {
		// Case where no points have been added
		if (!curve) {
			// Don't create a circle around the initial point if the stroke has more than one point.
			if (!this.isFirstSegment) {
				return [];
			}

			// Make the circle small -- because of the stroke style, we'll be drawing a stroke around it.
			const width = Viewport.roundPoint(
				this.averageWidth / 10,
				Math.min(this.minFitAllowed, this.averageWidth / 10),
			);
			const center = this.roundPoint(this.startPoint.pos);

			// Start on the right, cycle clockwise:
			//    |
			//  ----- ←
			//    |

			// Draw a circle-ish shape around the start point
			return [
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(width, width)),

					// Bottom of the circle
					//    |
					//  -----
					//    |
					//    ↑
					endPoint: center.plus(Vec2.of(0, width)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(-width, width)),
					endPoint: center.plus(Vec2.of(-width, 0)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(-width, -width)),
					endPoint: center.plus(Vec2.of(0, -width)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(width, -width)),
					endPoint: center.plus(Vec2.of(width, 0)),
				},
			];
		}

		const result: PathCommand[] = [];

		if (this.isFirstSegment) {
			result.push({
				kind: PathCommandType.MoveTo,
				point: this.roundPoint(curve.startPoint),
			});
		}

		result.push({
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: this.roundPoint(curve.controlPoint),
			endPoint: this.roundPoint(curve.endPoint),
		});

		return result;
	}

	private addCurve(curve: Curve | null) {
		const parts = this.curveToPathCommands(curve);
		this.parts.push(...parts);

		if (this.isFirstSegment) {
			this.isFirstSegment = false;
		}
	}

	public addPoint(newPoint: StrokeDataPoint) {
		this.curveFitter.addPoint(newPoint);
		this.widthAverageNumSamples++;
		this.averageWidth =
			(this.averageWidth * (this.widthAverageNumSamples - 1)) / this.widthAverageNumSamples +
			newPoint.width / this.widthAverageNumSamples;
	}
}
