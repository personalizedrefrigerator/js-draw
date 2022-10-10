import { Bezier } from 'bezier-js';
import AbstractRenderer, { RenderablePathSpec } from '../../rendering/renderers/AbstractRenderer';
import { Point2, Vec2 } from '../../math/Vec2';
import Rect2 from '../../math/Rect2';
import { LinePathCommand, PathCommand, PathCommandType, QuadraticBezierPathCommand } from '../../math/Path';
import LineSegment2 from '../../math/LineSegment2';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';

export const makeFreehandLineBuilder: ComponentBuilderFactory = (initialPoint: StrokeDataPoint, viewport: Viewport) => {
	// Don't smooth if input is more than ± 3 pixels from the true curve, do smooth if
	// less than ±1 px from the curve.
	const maxSmoothingDist = viewport.getSizeOfPixelOnCanvas() * 3;
	const minSmoothingDist = viewport.getSizeOfPixelOnCanvas();

	return new FreehandLineBuilder(
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
export default class FreehandLineBuilder implements ComponentBuilder {
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

	private buffer: Point2[];
	private lastPoint: StrokeDataPoint;
	private lastExitingVec: Vec2|null = null;
	private currentCurve: Bezier|null = null;
	private curveStartWidth: number;
	private curveEndWidth: number;

	// Stroke smoothing and tangent approximation
	private momentum: Vec2;
	private bbox: Rect2;

	public constructor(
		private startPoint: StrokeDataPoint,

		// Maximum distance from the actual curve (irrespective of stroke width)
		// for which a point is considered 'part of the curve'.
		// Note that the maximum will be smaller if the stroke width is less than
		// [maxFitAllowed].
		private minFitAllowed: number,
		private maxFitAllowed: number,

		private viewport: Viewport,
	) {
		this.lastPoint = this.startPoint;
		this.upperSegments = [];
		this.lowerSegments = [];

		this.buffer = [this.startPoint.pos];
		this.momentum = Vec2.zero;
		this.currentCurve = null;
		this.curveStartWidth = startPoint.width;

		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	private getRenderingStyle(): RenderingStyle {
		return {
			fill: this.lastPoint.color ?? null,
		};
	}

	private previewCurrentPath(): RenderablePathSpec|null {
		const upperPath = this.upperSegments.slice();
		const lowerPath = this.lowerSegments.slice();
		let lowerToUpperCap: PathCommand;
		let pathStartConnector: PathCommand;
		if (this.currentCurve) {
			const {
				upperCurveCommand, lowerToUpperConnector, upperToLowerConnector, lowerCurveCommand
			} = this.currentSegmentToPath();

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
		if (this.lastPoint) {
			this.finalizeCurrentCurve();
		}
		return this.previewStroke()!;
	}

	private roundPoint(point: Point2): Point2 {
		let minFit = Math.min(this.minFitAllowed, this.curveStartWidth / 2);

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
		if (lowerIntersection && !upperIntersection) {
			return true;
		}

		if (upperIntersection && !lowerIntersection) {
			return true;
		}

		return false;
	}

	// Returns the distance between the start, control, and end points of the curve.
	private approxCurrentCurveLength() {
		if (!this.currentCurve) {
			return 0;
		}
		const startPt = Vec2.ofXY(this.currentCurve.points[0]);
		const controlPt = Vec2.ofXY(this.currentCurve.points[1]);
		const endPt = Vec2.ofXY(this.currentCurve.points[2]);
		const toControlDist = startPt.minus(controlPt).length();
		const toEndDist = endPt.minus(controlPt).length();
		return toControlDist + toEndDist;
	}

	private finalizeCurrentCurve() {
		// Case where no points have been added
		if (!this.currentCurve) {
			// Don't create a circle around the initial point if the stroke has more than one point.
			if (!this.isFirstSegment) {
				return;
			}

			const width = Viewport.roundPoint(this.startPoint.width / 3.5, Math.min(this.minFitAllowed, this.startPoint.width / 4));
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
		} = this.currentSegmentToPath();

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

		const lastPoint = this.buffer[this.buffer.length - 1];
		this.lastExitingVec = Vec2.ofXY(
			this.currentCurve.points[2]
		).minus(Vec2.ofXY(this.currentCurve.points[1]));
		console.assert(this.lastExitingVec.magnitude() !== 0, 'lastExitingVec has zero length!');

		// Use the last two points to start a new curve (the last point isn't used
		// in the current curve and we want connected curves to share end points)
		this.buffer = [
			this.buffer[this.buffer.length - 2], lastPoint,
		];
		this.currentCurve = null;
	}

	// Returns [upper curve, connector, lower curve]
	private currentSegmentToPath(): CurrentSegmentToPathResult {
		if (this.currentCurve == null) {
			throw new Error('Invalid State: currentCurve is null!');
		}

		let startVec = Vec2.ofXY(this.currentCurve.normal(0)).normalized();
		let endVec = Vec2.ofXY(this.currentCurve.normal(1)).normalized();

		startVec = startVec.times(this.curveStartWidth / 2);
		endVec = endVec.times(this.curveEndWidth / 2);

		if (!isFinite(startVec.magnitude())) {
			console.error('Warning: startVec is NaN or ∞', startVec, endVec, this.currentCurve);
			startVec = endVec;
		}

		const startPt = Vec2.ofXY(this.currentCurve.get(0));
		const endPt = Vec2.ofXY(this.currentCurve.get(1));
		const controlPoint = Vec2.ofXY(this.currentCurve.points[1]);

		// Approximate the normal at the location of the control point
		let projectionT = this.currentCurve.project(controlPoint.xy).t;
		if (!projectionT) {
			if (startPt.minus(controlPoint).magnitudeSquared() < endPt.minus(controlPoint).magnitudeSquared()) {
				projectionT = 0.1;
			} else {
				projectionT = 0.9;
			}
		}

		const halfVecT = projectionT;
		const halfVec = Vec2.ofXY(this.currentCurve.normal(halfVecT))
			.normalized().times(
				this.curveStartWidth / 2 * halfVecT
				+ this.curveEndWidth / 2 * (1 - halfVecT)
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

	// Compute the direction of the velocity at the end of this.buffer
	private computeExitingVec(): Vec2 {
		return this.momentum.normalized().times(this.lastPoint.width / 2);
	}

	public addPoint(newPoint: StrokeDataPoint) {
		if (this.lastPoint) {
			// Ignore points that are identical
			const fuzzEq = 1e-10;
			const deltaTime = newPoint.time - this.lastPoint.time;
			if (newPoint.pos.eq(this.lastPoint.pos, fuzzEq) || deltaTime === 0) {
				return;
			} else if (isNaN(newPoint.pos.magnitude())) {
				console.warn('Discarding NaN point.', newPoint);
				return;
			}
			
			const threshold = Math.min(this.lastPoint.width, newPoint.width) / 3;
			const shouldSnapToInitial = this.startPoint.pos.minus(newPoint.pos).magnitude() < threshold
				&& this.isFirstSegment;
			
			// Snap to the starting point if the stroke is contained within a small ball centered
			// at the starting point.
			// This allows us to create a circle/dot at the start of the stroke.
			if (shouldSnapToInitial) {
				return;
			}

			const velocity = newPoint.pos.minus(this.lastPoint.pos).times(1 / (deltaTime) * 1000);
			this.momentum = this.momentum.lerp(velocity, 0.9);
		}

		const lastPoint = this.lastPoint ?? newPoint;
		this.lastPoint = newPoint;

		this.buffer.push(newPoint.pos);
		const pointRadius = newPoint.width / 2;
		const prevEndWidth = this.curveEndWidth;
		this.curveEndWidth = pointRadius;

		// recompute bbox
		this.bbox = this.bbox.grownToPoint(newPoint.pos, pointRadius);

		if (this.currentCurve === null) {
			const p1 = lastPoint.pos;
			const p2 = lastPoint.pos.plus(this.lastExitingVec ?? Vec2.unitX);
			const p3 = newPoint.pos;

			// Quadratic Bézier curve
			this.currentCurve = new Bezier(
				p1.xy, p2.xy, p3.xy
			);
			this.curveStartWidth = lastPoint.width / 2;
			console.assert(!isNaN(p1.magnitude()) && !isNaN(p2.magnitude()) && !isNaN(p3.magnitude()), 'Expected !NaN');
		}

		let enteringVec = this.lastExitingVec;
		if (!enteringVec) {
			let sampleIdx = Math.ceil(this.buffer.length / 2);
			if (sampleIdx === 0 || sampleIdx >= this.buffer.length) {
				sampleIdx = this.buffer.length - 1;
			}

			enteringVec = this.buffer[sampleIdx].minus(this.buffer[0]);
		}

		let exitingVec = this.computeExitingVec();

		// Find the intersection between the entering vector and the exiting vector
		const maxRelativeLength = 2;
		const segmentStart = this.buffer[0];
		const segmentEnd = newPoint.pos;
		const startEndDist = segmentEnd.minus(segmentStart).magnitude();
		const maxControlPointDist = maxRelativeLength * startEndDist;

		// Exit in cases where we would divide by zero
		if (maxControlPointDist === 0 || exitingVec.magnitude() === 0 || !isFinite(exitingVec.magnitude())) {
			return;
		}

		console.assert(isFinite(enteringVec.magnitude()), 'Pre-normalized enteringVec has NaN or ∞ magnitude!');

		enteringVec = enteringVec.normalized();
		exitingVec = exitingVec.normalized();

		console.assert(isFinite(enteringVec.magnitude()), 'Normalized enteringVec has NaN or ∞ magnitude!');

		const lineFromStart = new LineSegment2(
			segmentStart,
			segmentStart.plus(enteringVec.times(maxControlPointDist))
		);
		const lineFromEnd = new LineSegment2(
			segmentEnd.minus(exitingVec.times(maxControlPointDist)),
			segmentEnd
		);
		const intersection = lineFromEnd.intersection(lineFromStart);

		// Position the control point at this intersection
		let controlPoint: Point2|null = null;
		if (intersection) {
			controlPoint = intersection.point;
		}

		// No intersection or the intersection is one of the end points?
		if (!controlPoint || segmentStart.eq(controlPoint) || segmentEnd.eq(controlPoint)) {
			// Position the control point closer to the first -- the connecting
			// segment will be roughly a line.
			controlPoint = segmentStart.plus(enteringVec.times(startEndDist / 4));
		}

		console.assert(!segmentStart.eq(controlPoint, 1e-11), 'Start and control points are equal!');
		console.assert(!controlPoint.eq(segmentEnd, 1e-11), 'Control and end points are equal!');

		const prevCurve = this.currentCurve;
		this.currentCurve = new Bezier(segmentStart.xy, controlPoint.xy, segmentEnd.xy);

		if (isNaN(Vec2.ofXY(this.currentCurve.normal(0)).magnitude())) {
			console.error('NaN normal at 0. Curve:', this.currentCurve);
			this.currentCurve = prevCurve;
		}

		// Should we start making a new curve? Check whether all buffer points are within
		// ±strokeWidth of the curve.
		const curveMatchesPoints = (curve: Bezier): boolean => {
			for (const point of this.buffer) {
				const proj =
					Vec2.ofXY(curve.project(point.xy));
				const dist = proj.minus(point).magnitude();

				const minFit = Math.max(
					Math.min(this.curveStartWidth, this.curveEndWidth) / 3,
					this.minFitAllowed
				);
				if (dist > minFit || dist > this.maxFitAllowed) {
					return false;
				}
			}
			return true;
		};

		if (this.buffer.length > 3 && this.approxCurrentCurveLength() > this.curveStartWidth) {
			if (!curveMatchesPoints(this.currentCurve)) {
				// Use a curve that better fits the points
				this.currentCurve = prevCurve;
				this.curveEndWidth = prevEndWidth;

				// Reset the last point -- the current point was not added to the curve.
				this.lastPoint = lastPoint;

				this.finalizeCurrentCurve();
				return;
			}
		}
	}
}
