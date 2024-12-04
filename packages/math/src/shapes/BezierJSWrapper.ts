import { Bezier } from 'bezier-js';
import { Point2, Vec2 } from '../Vec2';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';
import Parameterized2DShape from './Parameterized2DShape';

// The typings for Bezier are incorrect in some cases:
interface CorrectedBezierType extends Bezier {
	dderivative(t: number): { x: number; y: number };
}

/**
 * A lazy-initializing wrapper around Bezier-js.
 *
 * Subclasses may override `at`, `derivativeAt`, and `normal` with functions
 * that do not initialize a `bezier-js` `Bezier`.
 *
 * **Do not use this class directly.** It may be removed/replaced in a future release.
 * @internal
 */
export abstract class BezierJSWrapper extends Parameterized2DShape {
	#bezierJs: CorrectedBezierType | null = null;

	protected constructor(bezierJsBezier?: Bezier) {
		super();

		if (bezierJsBezier) {
			this.#bezierJs = bezierJsBezier as CorrectedBezierType;
		}
	}

	/** Returns the start, control points, and end point of this Bézier. */
	public abstract getPoints(): readonly Point2[];

	protected getBezier() {
		if (!this.#bezierJs) {
			this.#bezierJs = new Bezier(this.getPoints().map((p) => p.xy)) as CorrectedBezierType;
		}
		return this.#bezierJs;
	}

	public override signedDistance(point: Point2): number {
		// .d: Distance
		return this.nearestPointTo(point).point.distanceTo(point);
	}

	/**
	 * @returns the (more) exact distance from `point` to this.
	 *
	 * @see {@link approximateDistance}
	 */
	public override distance(point: Point2) {
		// A Bézier curve has no interior, thus, signed distance is the same as distance.
		return this.signedDistance(point);
	}

	/**
	 * @returns the curve evaluated at `t`.
	 */
	public override at(t: number): Point2 {
		return Vec2.ofXY(this.getBezier().get(t));
	}

	/** @returns the curve's directional derivative at `t`. */
	public derivativeAt(t: number): Point2 {
		return Vec2.ofXY(this.getBezier().derivative(t));
	}

	public secondDerivativeAt(t: number): Point2 {
		return Vec2.ofXY(this.getBezier().dderivative(t));
	}

	/** @returns the [normal vector](https://en.wikipedia.org/wiki/Normal_(geometry)) to this curve at `t`. */
	public normal(t: number): Vec2 {
		return Vec2.ofXY(this.getBezier().normal(t));
	}

	public override normalAt(t: number): Vec2 {
		return this.normal(t);
	}

	public override tangentAt(t: number): Vec2 {
		return this.derivativeAt(t).normalized();
	}

	public override getTightBoundingBox(): Rect2 {
		const bbox = this.getBezier().bbox();
		const width = bbox.x.max - bbox.x.min;
		const height = bbox.y.max - bbox.y.min;

		return new Rect2(bbox.x.min, bbox.y.min, width, height);
	}

	public override argIntersectsLineSegment(line: LineSegment2): number[] {
		// Bezier-js has a bug when all control points of a Bezier curve lie on
		// a line. Our solution involves converting the Bezier into a line, then
		// finding the parameter value that produced the intersection.
		//
		// TODO: This is unnecessarily slow. A better solution would be to fix
		// the bug upstream.
		const asLine = LineSegment2.ofSmallestContainingPoints(this.getPoints());
		if (asLine) {
			const intersection = asLine.intersectsLineSegment(line);
			return intersection.map((p) => this.nearestPointTo(p).parameterValue);
		}

		const bezier = this.getBezier();

		return bezier
			.intersects(line)
			.map((t) => {
				// We're using the .intersects(line) function, which is documented
				// to always return numbers. However, to satisfy the type checker (and
				// possibly improperly-defined types),
				if (typeof t === 'string') {
					t = parseFloat(t);
				}

				const point = Vec2.ofXY(this.at(t));

				// Ensure that the intersection is on the line segment
				if (point.distanceTo(line.p1) > line.length || point.distanceTo(line.p2) > line.length) {
					return null;
				}

				return t;
			})
			.filter((entry) => entry !== null);
	}

	public override splitAt(t: number): [BezierJSWrapper] | [BezierJSWrapper, BezierJSWrapper] {
		if (t <= 0 || t >= 1) {
			return [this];
		}

		const bezier = this.getBezier();
		const split = bezier.split(t);
		return [
			new BezierJSWrapperImpl(
				split.left.points.map((point) => Vec2.ofXY(point)),
				split.left,
			),
			new BezierJSWrapperImpl(
				split.right.points.map((point) => Vec2.ofXY(point)),
				split.right,
			),
		];
	}

	public override nearestPointTo(point: Point2) {
		// One implementation could be similar to this:
		//   const projection = this.getBezier().project(point);
		//   return {
		//    point: Vec2.ofXY(projection),
		//    parameterValue: projection.t!,
		//   };
		// However, Bezier-js is rather impercise (and relies on a lookup table).
		// Thus, we instead use Newton's Method:

		// We want to find t such that f(t) = |B(t) - p|² is minimized.
		// Expanding,
		//   f(t)  = (Bₓ(t) - pₓ)² + (Bᵧ(t) - pᵧ)²
		// ⇒ f'(t) = Dₜ(Bₓ(t) - pₓ)² + Dₜ(Bᵧ(t) - pᵧ)²
		// ⇒ f'(t) = 2(Bₓ(t) - pₓ)(Bₓ'(t)) + 2(Bᵧ(t) - pᵧ)(Bᵧ'(t))
		//         = 2Bₓ(t)Bₓ'(t) - 2pₓBₓ'(t) + 2Bᵧ(t)Bᵧ'(t) - 2pᵧBᵧ'(t)
		// ⇒ f''(t)= 2Bₓ'(t)Bₓ'(t) + 2Bₓ(t)Bₓ''(t) - 2pₓBₓ''(t) + 2Bᵧ'(t)Bᵧ'(t)
		//         + 2Bᵧ(t)Bᵧ''(t) - 2pᵧBᵧ''(t)
		// Because f'(t) = 0 at relative extrema, we can use Newton's Method
		// to improve on an initial guess.

		const sqrDistAt = (t: number) => point.squareDistanceTo(this.at(t));
		const yIntercept = sqrDistAt(0);
		let t = 0;
		let minSqrDist = yIntercept;

		// Start by testing a few points:
		const pointsToTest = 4;
		for (let i = 0; i < pointsToTest; i++) {
			const testT = i / (pointsToTest - 1);
			const testMinSqrDist = sqrDistAt(testT);

			if (testMinSqrDist < minSqrDist) {
				t = testT;
				minSqrDist = testMinSqrDist;
			}
		}

		// To use Newton's Method, we need to evaluate the second derivative of the distance
		// function:
		const secondDerivativeAt = (t: number) => {
			// f''(t) = 2Bₓ'(t)Bₓ'(t) + 2Bₓ(t)Bₓ''(t) - 2pₓBₓ''(t)
			//        + 2Bᵧ'(t)Bᵧ'(t) + 2Bᵧ(t)Bᵧ''(t) - 2pᵧBᵧ''(t)
			const b = this.at(t);
			const bPrime = this.derivativeAt(t);
			const bPrimePrime = this.secondDerivativeAt(t);
			return (
				2 * bPrime.x * bPrime.x +
				2 * b.x * bPrimePrime.x -
				2 * point.x * bPrimePrime.x +
				2 * bPrime.y * bPrime.y +
				2 * b.y * bPrimePrime.y -
				2 * point.y * bPrimePrime.y
			);
		};
		// Because we're zeroing f'(t), we also need to be able to compute it:
		const derivativeAt = (t: number) => {
			// f'(t) = 2Bₓ(t)Bₓ'(t) - 2pₓBₓ'(t) + 2Bᵧ(t)Bᵧ'(t) - 2pᵧBᵧ'(t)
			const b = this.at(t);
			const bPrime = this.derivativeAt(t);
			return (
				2 * b.x * bPrime.x - 2 * point.x * bPrime.x + 2 * b.y * bPrime.y - 2 * point.y * bPrime.y
			);
		};

		const iterate = () => {
			const slope = secondDerivativeAt(t);
			if (slope === 0) return;

			// We intersect a line through the point on f'(t) at t with the x-axis:
			//    y = m(x - x₀) + y₀
			// ⇒  x - x₀ = (y - y₀) / m
			// ⇒  x = (y - y₀) / m + x₀
			//
			// Thus, when zeroed,
			//   tN = (0 - f'(t)) / m + t
			const newT = (0 - derivativeAt(t)) / slope + t;
			//const distDiff = sqrDistAt(newT) - sqrDistAt(t);
			//console.assert(distDiff <= 0, `${-distDiff} >= 0`);
			t = newT;
			if (t > 1) {
				t = 1;
			} else if (t < 0) {
				t = 0;
			}
		};

		for (let i = 0; i < 12; i++) {
			iterate();
		}

		return { parameterValue: t, point: this.at(t) };
	}

	public intersectsBezier(other: BezierJSWrapper) {
		const intersections = this.getBezier().intersects(other.getBezier()) as
			| string[]
			| null
			| undefined;
		if (!intersections || intersections.length === 0) {
			return [];
		}

		const result = [];
		for (const intersection of intersections) {
			// From http://pomax.github.io/bezierjs/#intersect-curve,
			// .intersects returns an array of 't1/t2' pairs, where curve1.at(t1) gives the point.
			const match = /^([-0-9.eE]+)\/([-0-9.eE]+)$/.exec(intersection);

			if (!match) {
				throw new Error(
					`Incorrect format returned by .intersects: ${intersections} should be array of "number/number"!`,
				);
			}

			const t = parseFloat(match[1]);
			result.push({
				parameterValue: t,
				point: this.at(t),
			});
		}
		return result;
	}

	public override toString() {
		return `Bézier(${this.getPoints()
			.map((point) => point.toString())
			.join(', ')})`;
	}
}

/**
 * Private concrete implementation of `BezierJSWrapper`, used by methods above that need to return a wrapper
 * around a `Bezier`.
 */
class BezierJSWrapperImpl extends BezierJSWrapper {
	public constructor(
		private controlPoints: readonly Point2[],
		curve?: Bezier,
	) {
		super(curve);
	}

	public override getPoints() {
		return this.controlPoints;
	}
}

export default BezierJSWrapper;
