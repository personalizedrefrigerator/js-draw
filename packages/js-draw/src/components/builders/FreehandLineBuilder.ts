import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import RenderablePathSpec from '../../rendering/RenderablePathSpec';
import { Point2, Vec2, Rect2, Color4, PathCommand, PathCommandType } from '@js-draw/math';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';
import { StrokeSmoother, Curve } from '../util/StrokeSmoother';

export const makeFreehandLineBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, viewport: Viewport) => {
	// Don't smooth if input is more than ± 3 pixels from the true curve, do smooth if
	// less than ±1 px from the curve.
	const maxSmoothingDist = viewport.getSizeOfPixelOnCanvas() * 3;
	const minSmoothingDist = viewport.getSizeOfPixelOnCanvas();

	return new FreehandLineBuilder(
		initialPoint, minSmoothingDist, maxSmoothingDist, viewport
	);
};

// Handles stroke smoothing and creates Strokes from user/stylus input.
export default class FreehandLineBuilder implements ComponentBuilder {
	private isFirstSegment: boolean = true;

	private upperParts: PathCommand[] = [];
	private lowerParts: PathCommand[] = [];

	private curveFitter: StrokeSmoother;

	private bbox: Rect2;
	private strokeWidth: number;

	public constructor(
		private startPoint: StrokeDataPoint,

		private minFitAllowed: number,
		maxFitAllowed: number,

		private viewport: Viewport,
	) {
		this.curveFitter = new StrokeSmoother(startPoint, minFitAllowed, maxFitAllowed, (curve: Curve|null) => this.addCurve(curve));

		this.strokeWidth = startPoint.width;
		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	protected getRenderingStyle(): RenderingStyle {
		return {
			fill: Color4.transparent,
			stroke: {
				color: this.startPoint.color,
				width: this.roundDistance(this.strokeWidth),
			}
		};
	}

	protected previewCurrentPath(): RenderablePathSpec|null {
		const upperPath = this.upperParts;
		const lowerPath = this.lowerParts;

		const [ nextUpperCommands, nextLowerCommands ] = this.curveToPathCommands(this.curveFitter.preview());
		const commands = [ ...upperPath, ...nextUpperCommands, ...lowerPath, ...nextLowerCommands ];
		const startPoint = this.startPoint.pos;

		return {
			startPoint,

			commands,
			style: this.getRenderingStyle(),
		};
	}

	protected previewFullPath(): RenderablePathSpec[]|null {
		const preview = this.previewCurrentPath();
		if (preview) {
			return [ preview ];
		}
		return null;
	}

	private previewStroke(): Stroke|null {
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
		let minFit = Math.min(this.minFitAllowed, this.strokeWidth / 3);

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

	private curveToPathCommands(curve: Curve|null): [PathCommand[], PathCommand[]] {
		// Case where no points have been added
		if (!curve) {
			// Don't create a circle around the initial point if the stroke has more than one point.
			if (!this.isFirstSegment) {
				return [[], []];
			}

			// Make the circle small -- because of the stroke style, we'll be drawing a stroke around it.
			const width = Viewport.roundPoint(this.strokeWidth / 10, Math.min(this.minFitAllowed, this.strokeWidth / 10));
			const center = this.roundPoint(this.startPoint.pos);

			// Start on the right, cycle clockwise:
			//    |
			//  ----- ←
			//    |

			// Draw a circle-ish shape around the start point
			return [[
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
				}
			], []];
		}

		const mainCommands: PathCommand[] = [];
		const pressureCommands: PathCommand[] = [];

		const startPressureDisplacement = Vec2.of(0, curve.startWidth - this.strokeWidth);
		const endPressureDisplacement = Vec2.of(0, curve.endWidth - this.strokeWidth);
		const midPressureDisplacement = startPressureDisplacement.lerp(endPressureDisplacement, 0.5);

		this.strokeWidth = Math.max(this.strokeWidth, endPressureDisplacement.length());

		if (this.isFirstSegment) {
			mainCommands.push({
				kind: PathCommandType.MoveTo,
				point: this.roundPoint(curve.startPoint),
			});

			pressureCommands.push({
				kind: PathCommandType.MoveTo,
				point: this.roundPoint(curve.startPoint.plus(startPressureDisplacement)),
			});
		}

		mainCommands.push({
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: this.roundPoint(curve.controlPoint),
			endPoint: this.roundPoint(curve.endPoint),
		});

		pressureCommands.push({
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: this.roundPoint(curve.controlPoint.plus(midPressureDisplacement)),
			endPoint: this.roundPoint(curve.endPoint.plus(endPressureDisplacement)),
		});

		return [ mainCommands, pressureCommands ];
	}

	private addCurve(curve: Curve|null) {
		const [ upperParts, lowerParts ] = this.curveToPathCommands(curve);
		this.upperParts.push(...upperParts);
		this.lowerParts.push(...lowerParts);

		if (this.isFirstSegment) {
			this.isFirstSegment = false;
		}
	}

	public addPoint(newPoint: StrokeDataPoint) {
		this.curveFitter.addPoint(newPoint);
		this.bbox = this.bbox.grownToPoint(newPoint.pos);
	}
}
