import { Point2, Vec2, Rect2, LineSegment2, QuadraticBezier } from '@js-draw/math';
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
	private currentCurve: QuadraticBezier|null = null;
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
		const startPt = this.currentCurve.p0;
		const controlPt = this.currentCurve.p1;
		const endPt = this.currentCurve.p2;
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
		this.lastExitingVec = this.currentCurve.p2.minus(this.currentCurve.p1);
		console.assert(this.lastExitingVec.magnitude() !== 0, 'lastExitingVec has zero length!');

		// Use the last two points to start a new curve (the last point isn't used
		// in the current curve and we want connected curves to share end points)
		this.buffer = [
			this.buffer[this.buffer.length - 2], lastPoint,
		];
		this.currentCurve = null;

		this.isFirstSegment = false;
	}

	// Returns [upper curve, connector, lower curve]
	private currentSegmentToPath() {
		if (this.currentCurve == null) {
			throw new Error('Invalid State: currentCurve is null!');
		}

		const startVec = this.currentCurve.normal(0).normalized();

		if (!isFinite(startVec.magnitude())) {
			throw new Error(`startVec(${startVec}) is NaN or ∞`);
		}

		const startPt = this.currentCurve.at(0);
		const endPt = this.currentCurve.at(1);
		const controlPoint = this.currentCurve.p1;

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

			const deltaTimeSeconds = deltaTime / 1000;
			const velocity = newPoint.pos.minus(this.lastPoint.pos).times(1 / deltaTimeSeconds);

			// TODO: Do we need momentum smoothing? (this.momentum.lerp(velocity, 0.9);)
			this.momentum = velocity;
		}

		const lastPoint = this.lastPoint ?? newPoint;
		this.lastPoint = newPoint;

		this.buffer.push(newPoint.pos);
		const pointRadius = newPoint.width;
		const prevEndWidth = this.curveEndWidth;
		this.curveEndWidth = pointRadius;

		// recompute bbox
		this.bbox = this.bbox.grownToPoint(newPoint.pos, pointRadius);

		// If the last curve just ended or it's the first curve,
		if (this.currentCurve === null) {
			const p1 = lastPoint.pos;
			const p2 = lastPoint.pos.plus(this.lastExitingVec ?? Vec2.unitX);
			const p3 = newPoint.pos;

			// Quadratic Bézier curve
			this.currentCurve = new QuadraticBezier(p1, p2, p3);
			console.assert(!isNaN(p1.magnitude()) && !isNaN(p2.magnitude()) && !isNaN(p3.magnitude()), 'Expected !NaN');

			if (this.isFirstSegment) {
				// The start of a curve often lacks accurate pressure information. Update it.
				this.curveStartWidth = (this.curveStartWidth + pointRadius) / 2;
			}
			else {
				this.curveStartWidth = prevEndWidth;
			}
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
		const maxRelativeLength = 1.7;
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

		// No intersection?
		if (!controlPoint) {
			// Estimate the control point position based on the entering tangent line
			controlPoint = segmentStart
				.lerp(segmentEnd, 0.5)
				.lerp(segmentStart.plus(enteringVec.times(startEndDist)), 0.1);
		}

		// Equal to an endpoint?
		if (segmentStart.eq(controlPoint) || segmentEnd.eq(controlPoint)) {
			// Position the control point closer to the first -- the connecting
			// segment will be roughly a line.
			controlPoint = segmentStart.plus(enteringVec.times(startEndDist / 5));
		}

		console.assert(!segmentStart.eq(controlPoint, 1e-11), 'Start and control points are equal!');
		console.assert(!controlPoint.eq(segmentEnd, 1e-11), 'Control and end points are equal!');

		const prevCurve = this.currentCurve;
		this.currentCurve = new QuadraticBezier(segmentStart, controlPoint, segmentEnd);

		if (isNaN(this.currentCurve.normal(0).magnitude())) {
			console.error('NaN normal at 0. Curve:', this.currentCurve);
			this.currentCurve = prevCurve;
		}

		// Should we start making a new curve? Check whether all buffer points are within
		// ±strokeWidth of the curve.
		const curveMatchesPoints = (curve: QuadraticBezier): boolean => {
			const minFit = Math.min(Math.max(
				Math.min(this.curveStartWidth, this.curveEndWidth) / 4,
				this.minFitAllowed
			), this.maxFitAllowed);

			// The sum of distances greater than minFit must not exceed this:
			const maxNonMatchingDistSum = minFit;

			// Sum of distances greater than minFit.
			let nonMatchingDistSum = 0;

			for (const point of this.buffer) {
				let dist = curve.approximateDistance(point);

				if (dist > minFit) {
					// Use the more accurate distance function
					dist = curve.distance(point);

					nonMatchingDistSum += Math.max(0, dist - minFit);
					if (nonMatchingDistSum > maxNonMatchingDistSum) {
						return false; // false: Curve doesn't match points well enough.
					}
				}
			}
			return true;
		};

		if (this.buffer.length > 3 && this.approxCurrentCurveLength() > this.curveStartWidth / 2) {
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