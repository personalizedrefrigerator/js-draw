import { Bezier } from 'bezier-js';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import RenderablePathSpec from '../../rendering/RenderablePathSpec';
import { Point2, Vec2, Rect2, PathCommand, PathCommandType, QuadraticBezierPathCommand, LinePathCommand } from '@js-draw/math';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';
import { StrokeSmoother, Curve } from '../util/StrokeSmoother';

export const makePressureSensitiveFreehandLineBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, viewport: Viewport) => {
	// Don't smooth if input is more than ± 3 pixels from the true curve, do smooth if
	// less than ±1 px from the curve.
	const maxSmoothingDist = viewport.getSizeOfPixelOnCanvas() * 3;
	const minSmoothingDist = viewport.getSizeOfPixelOnCanvas();

	return new PressureSensitiveFreehandLineBuilder(
		initialPoint, minSmoothingDist, maxSmoothingDist, viewport
	);
};

type CurrentSegmentToPathResult = {
	upperCurveCommand: QuadraticBezierPathCommand,
	lowerToUpperConnector: PathCommand,
	upperToLowerConnector: PathCommand,
	lowerCurveCommand: QuadraticBezierPathCommand,

	upperCurve: Bezier,
	lowerCurve: Bezier,
};

// Handles stroke smoothing and creates Strokes from user/stylus input.
export default class PressureSensitiveFreehandLineBuilder implements ComponentBuilder {
	private isFirstSegment: boolean = true;
	private pathStartConnector: PathCommand|null = null;
	private mostRecentConnector: PathCommand|null = null;

	//    Beginning of the list of lower parts
	//        ↓
	//        /---pathStartConnector---/ ← Beginning of the list of upper parts
	//    ___/                      __/
	//   /                         /
	//  /--Most recent connector--/ ← most recent upper part goes here
	//  ↑
	//  most recent lower part goes here
	//
	// The upperSegments form a path that goes in reverse from the most recent edge to the
	// least recent edge.
	// The lowerSegments form a path that goes from the least recent edge to the most
	// recent edge.
	private upperSegments: PathCommand[];
	private lowerSegments: PathCommand[];
	private lastUpperBezier: Bezier|null = null;
	private lastLowerBezier: Bezier|null = null;
	private parts: RenderablePathSpec[] = [];
	private curveFitter: StrokeSmoother;

	private curveStartWidth: number;

	private bbox: Rect2;

	public constructor(
		private startPoint: StrokeDataPoint,

		// Maximum distance from the actual curve (irrespective of stroke width)
		// for which a point is considered 'part of the curve'.
		// Note that the maximum will be smaller if the stroke width is less than
		// [maxFitAllowed].
		private minFitAllowed: number,
		maxFitAllowed: number,

		private viewport: Viewport,
	) {
		this.upperSegments = [];
		this.lowerSegments = [];

		this.curveFitter = new StrokeSmoother(startPoint, minFitAllowed, maxFitAllowed, curve => this.addCurve(curve));

		this.curveStartWidth = startPoint.width;
		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	private getRenderingStyle(): RenderingStyle {
		return {
			fill: this.startPoint.color ?? null,
		};
	}

	private previewCurrentPath(): RenderablePathSpec|null {
		const upperPath = this.upperSegments.slice();
		const lowerPath = this.lowerSegments.slice();
		let lowerToUpperCap: PathCommand;
		let pathStartConnector: PathCommand;

		const currentCurve = this.curveFitter.preview();
		if (currentCurve) {
			const {
				upperCurveCommand, lowerToUpperConnector, upperToLowerConnector, lowerCurveCommand
			} = this.segmentToPath(currentCurve);

			upperPath.push(upperCurveCommand);
			lowerPath.push(lowerCurveCommand);

			lowerToUpperCap = lowerToUpperConnector;
			pathStartConnector = this.pathStartConnector ?? upperToLowerConnector;
		} else {
			if (this.mostRecentConnector === null || this.pathStartConnector === null) {
				return null;
			}

			lowerToUpperCap = this.mostRecentConnector;
			pathStartConnector = this.pathStartConnector;
		}

		let startPoint: Point2;
		const lastLowerSegment = lowerPath[lowerPath.length - 1];
		if (lastLowerSegment.kind === PathCommandType.LineTo || lastLowerSegment.kind === PathCommandType.MoveTo) {
			startPoint = lastLowerSegment.point;
		} else {
			startPoint = lastLowerSegment.endPoint;
		}

		return {
			// Start at the end of the lower curve:
			//    Start point
			//     ↓
			//  __/  __/ ← Most recent points on this end
			// /___ /
			//  ↑
			//  Oldest points
			startPoint,

			commands: [
				// Move to the most recent point on the upperPath:
				//     ----→•
				//  __/  __/
				// /___ /
				lowerToUpperCap,

				// Move to the beginning of the upperPath:
				//  __/  __/
				// /___ /
				//     • ←-
				...upperPath.reverse(),

				// Move to the beginning of the lowerPath:
				//  __/  __/
				// /___ /
				// •
				pathStartConnector,

				// Move back to the start point:
				//     •
				//  __/  __/
				// /___ /
				...lowerPath,
			],
			style: this.getRenderingStyle(),
		};
	}

	private previewFullPath(): RenderablePathSpec[]|null {
		const preview = this.previewCurrentPath();
		if (preview) {
			return [ ...this.parts, preview ];
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
		if (this.isFirstSegment) {
			// Ensure we have something.
			this.addCurve(null);
		}

		return this.previewStroke()!;
	}

	private roundPoint(point: Point2): Point2 {
		let minFit = Math.min(this.minFitAllowed, this.curveStartWidth / 3);

		if (minFit < 1e-10) {
			minFit = this.minFitAllowed;
		}

		return Viewport.roundPoint(point, minFit);
	}

	// Returns true if, due to overlap with previous segments, a new RenderablePathSpec should be created.
	private shouldStartNewSegment(lowerCurve: Bezier, upperCurve: Bezier): boolean {
		if (!this.lastLowerBezier || !this.lastUpperBezier) {
			return false;
		}

		const getIntersection = (curve1: Bezier, curve2: Bezier): Point2|null => {
			const intersection = curve1.intersects(curve2) as (string[] | null | undefined);
			if (!intersection || intersection.length === 0) {
				return null;
			}

			// From http://pomax.github.io/bezierjs/#intersect-curve,
			// .intersects returns an array of 't1/t2' pairs, where curve1.at(t1) gives the point.
			const firstTPair = intersection[0];
			const match = /^([-0-9.eE]+)\/([-0-9.eE]+)$/.exec(firstTPair);

			if (!match) {
				throw new Error(
					`Incorrect format returned by .intersects: ${intersection} should be array of "number/number"!`
				);
			}

			const t = parseFloat(match[1]);
			return Vec2.ofXY(curve1.get(t));
		};

		const getExitDirection = (curve: Bezier): Vec2 => {
			return Vec2.ofXY(curve.points[2]).minus(Vec2.ofXY(curve.points[1])).normalized();
		};

		const getEnterDirection = (curve: Bezier): Vec2 => {
			return Vec2.ofXY(curve.points[1]).minus(Vec2.ofXY(curve.points[0])).normalized();
		};

		// Prevent
		//         /
		//       / /
		//      /  /  /|
		//    /    /   |
		//  /          |
		// where the next stroke and the previous stroke are in different directions.
		//
		// Are the exit/enter directions of the previous and current curves in different enough directions?
		if (getEnterDirection(upperCurve).dot(getExitDirection(this.lastUpperBezier)) < 0.3
			|| getEnterDirection(lowerCurve).dot(getExitDirection(this.lastLowerBezier)) < 0.3

			// Also handle if the curves exit/enter directions differ
			|| getEnterDirection(upperCurve).dot(getExitDirection(upperCurve)) < 0
			|| getEnterDirection(lowerCurve).dot(getExitDirection(lowerCurve)) < 0) {
			return true;
		}

		// Check whether the lower curve intersects the other wall:
		//       /    / ← lower
		//    / /   /
		// /   / /
		//   //
		// / /
		const lowerIntersection = getIntersection(lowerCurve, this.lastUpperBezier);
		const upperIntersection = getIntersection(upperCurve, this.lastLowerBezier);
		if (lowerIntersection || upperIntersection) {
			return true;
		}

		return false;
	}

	private addCurve(curve: Curve|null) {
		// Case where no points have been added
		if (!curve) {
			// Don't create a circle around the initial point if the stroke has more than one point.
			if (!this.isFirstSegment) {
				return;
			}

			const width = Viewport.roundPoint(this.startPoint.width / 2.2, Math.min(this.minFitAllowed, this.startPoint.width / 4));
			const center = this.roundPoint(this.startPoint.pos);

			// Start on the right, cycle clockwise:
			//    |
			//  ----- ←
			//    |
			const startPoint = this.startPoint.pos.plus(Vec2.of(width, 0));

			// Draw a circle-ish shape around the start point
			this.lowerSegments.push(
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
			);
			this.pathStartConnector = {
				kind: PathCommandType.LineTo,
				point: startPoint,
			};
			this.mostRecentConnector = this.pathStartConnector;

			return;
		}

		const {
			upperCurveCommand, lowerToUpperConnector, upperToLowerConnector, lowerCurveCommand,
			lowerCurve, upperCurve,
		} = this.segmentToPath(curve);

		const shouldStartNew = this.shouldStartNewSegment(lowerCurve, upperCurve);

		if (shouldStartNew) {
			const part = this.previewCurrentPath();

			if (part) {
				this.parts.push(part);
				this.upperSegments = [];
				this.lowerSegments = [];
			}
		}

		if (this.isFirstSegment || shouldStartNew) {
			// We draw the upper path (reversed), then the lower path, so we need the
			// upperToLowerConnector to join the two paths.
			this.pathStartConnector = upperToLowerConnector;
			this.isFirstSegment = false;
		}
		// With the most recent connector, we're joining the end of the lowerPath to the most recent
		// upperPath:
		this.mostRecentConnector = lowerToUpperConnector;

		this.lowerSegments.push(lowerCurveCommand);
		this.upperSegments.push(upperCurveCommand);

		this.lastLowerBezier = lowerCurve;
		this.lastUpperBezier = upperCurve;
		this.curveStartWidth = curve.startWidth;
	}

	// Returns [upper curve, connector, lower curve]
	private segmentToPath(curve: Curve): CurrentSegmentToPathResult {
		const bezier = new Bezier(curve.startPoint.xy, curve.controlPoint.xy, curve.endPoint.xy);
		let startVec = Vec2.ofXY(bezier.normal(0)).normalized();
		let endVec = Vec2.ofXY(bezier.normal(1)).normalized();

		startVec = startVec.times(curve.startWidth / 2);
		endVec = endVec.times(curve.endWidth / 2);

		if (!isFinite(startVec.magnitude())) {
			console.error('Warning: startVec is NaN or ∞', startVec, endVec, curve);
			startVec = endVec;
		}

		const startPt = curve.startPoint;
		const endPt = curve.endPoint;
		const controlPoint = curve.controlPoint;

		// Approximate the normal at the location of the control point
		let projectionT = bezier.project(controlPoint.xy).t;
		if (!projectionT) {
			if (startPt.minus(controlPoint).magnitudeSquared() < endPt.minus(controlPoint).magnitudeSquared()) {
				projectionT = 0.1;
			} else {
				projectionT = 0.9;
			}
		}

		const halfVecT = projectionT;
		const halfVec = Vec2.ofXY(bezier.normal(halfVecT))
			.normalized().times(
				curve.startWidth / 2 * halfVecT
				+ curve.endWidth / 2 * (1 - halfVecT)
			);

		// Each starts at startPt ± startVec
		const lowerCurveStartPoint = this.roundPoint(startPt.plus(startVec));
		const lowerCurveControlPoint = this.roundPoint(controlPoint.plus(halfVec));
		const lowerCurveEndPoint = this.roundPoint(endPt.plus(endVec));
		const upperCurveControlPoint = this.roundPoint(controlPoint.minus(halfVec));
		const upperCurveStartPoint = this.roundPoint(endPt.minus(endVec));
		const upperCurveEndPoint = this.roundPoint(startPt.minus(startVec));

		const lowerCurveCommand: QuadraticBezierPathCommand = {
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: lowerCurveControlPoint,
			endPoint: lowerCurveEndPoint,
		};

		// From the end of the upperCurve to the start of the lowerCurve:
		const upperToLowerConnector: LinePathCommand = {
			kind: PathCommandType.LineTo,
			point: lowerCurveStartPoint,
		};

		// From the end of lowerCurve to the start of upperCurve:
		const lowerToUpperConnector: LinePathCommand = {
			kind: PathCommandType.LineTo,
			point: upperCurveStartPoint,
		};

		const upperCurveCommand: QuadraticBezierPathCommand = {
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: upperCurveControlPoint,
			endPoint: upperCurveEndPoint,
		};

		const upperCurve = new Bezier(upperCurveStartPoint, upperCurveControlPoint, upperCurveEndPoint);
		const lowerCurve = new Bezier(lowerCurveStartPoint, lowerCurveControlPoint, lowerCurveEndPoint);

		return {
			upperCurveCommand, upperToLowerConnector, lowerToUpperConnector, lowerCurveCommand,
			upperCurve, lowerCurve,
		};
	}

	public addPoint(newPoint: StrokeDataPoint) {
		this.curveFitter.addPoint(newPoint);
	}
}
