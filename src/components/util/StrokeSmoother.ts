import { Bezier } from 'bezier-js';
import { Point2, Vec2 } from '../../math/Vec2';
import Rect2 from '../../math/Rect2';
import LineSegment2 from '../../math/LineSegment2';
import { StrokeDataPoint } from '../../types';

export interface Curve {
    startPoint: Vec2;
    startWidth: number;

    controlPoint: Vec2;

    endWidth: number;
    endPoint: Vec2;
}

type OnCurveAddedCallback = (curve: Curve|null)=>void;

// Handles stroke smoothing
export class StrokeSmoother {
	private isFirstSegment: boolean = true;

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

        private onCurveAdded: OnCurveAddedCallback,
	) {
		this.lastPoint = this.startPoint;

		this.buffer = [this.startPoint.pos];
		this.momentum = Vec2.zero;
		this.currentCurve = null;
		this.curveStartWidth = startPoint.width;

		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	public preview(): Curve|null {
		if (!this.currentCurve) {
			return null;
		}

		return this.currentSegmentToPath();
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

	public finalizeCurrentCurve() {
		// Case where no points have been added
		if (!this.currentCurve) {
			return;
		}

		this.onCurveAdded(this.currentSegmentToPath());

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
	private currentSegmentToPath() {
		if (this.currentCurve == null) {
			throw new Error('Invalid State: currentCurve is null!');
		}

		const startVec = Vec2.ofXY(this.currentCurve.normal(0)).normalized();

		if (!isFinite(startVec.magnitude())) {
			throw new Error(`startVec(${startVec}) is NaN or ∞`);
		}

		const startPt = Vec2.ofXY(this.currentCurve.get(0));
		const endPt = Vec2.ofXY(this.currentCurve.get(1));
		const controlPoint = Vec2.ofXY(this.currentCurve.points[1]);

		return {
			startPoint: startPt,
			controlPoint,
			endPoint: endPt,
			startWidth: this.curveStartWidth,
			endWidth: this.curveEndWidth,
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

		if (this.isFirstSegment) {
			// The start of a curve often lacks accurate pressure information. Update it.
			this.curveStartWidth = (this.curveStartWidth + pointRadius) / 2;
		}

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

		// If there isn't an entering vector (e.g. because this.isFirstCurve), approximate it.
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
		const maxRelativeLength = 2.2;
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
			controlPoint = segmentStart.plus(enteringVec.times(startEndDist / 3));
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

export default StrokeSmoother;
