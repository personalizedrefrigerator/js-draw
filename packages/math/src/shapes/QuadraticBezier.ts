import { Point2, Vec2 } from '../Vec2';
import solveQuadratic from '../polynomial/solveQuadratic';
import BezierJSWrapper from './BezierJSWrapper';
import Rect2 from './Rect2';

/**
 * Represents a 2D [Bézier curve](https://en.wikipedia.org/wiki/B%C3%A9zier_curve).
 *
 * Example:
 * ```ts,runnable,console
 * import { QuadraticBezier, Vec2 } from '@js-draw/math';
 *
 * const startPoint = Vec2.of(4, 3);
 * const controlPoint = Vec2.of(1, 1);
 * const endPoint = Vec2.of(1, 3);
 *
 * const curve = new QuadraticBezier(
 *   startPoint,
 *   controlPoint,
 *   endPoint,
 * );
 *
 * console.log('Curve:', curve);
 * ```
 *
 * **Note**: Some Bézier operations internally use the `bezier-js` library.
 */
export class QuadraticBezier extends BezierJSWrapper {
	public constructor(
		// Start point
		public readonly p0: Point2,
		// Control point
		public readonly p1: Point2,
		// End point
		public readonly p2: Point2,
	) {
		super();
	}

	/**
	 * Returns a component of a quadratic Bézier curve at t, where p0,p1,p2 are either all x or
	 * all y components of the target curve.
	 */
	private static componentAt(t: number, p0: number, p1: number, p2: number) {
		return p0 + t * (-2 * p0 + 2 * p1) + t * t * (p0 - 2 * p1 + p2);
	}

	private static derivativeComponentAt(t: number, p0: number, p1: number, p2: number) {
		return -2 * p0 + 2 * p1 + 2 * t * (p0 - 2 * p1 + p2);
	}

	private static secondDerivativeComponentAt(t: number, p0: number, p1: number, p2: number) {
		return 2 * (p0 - 2 * p1 + p2);
	}

	/**
	 * @returns the curve evaluated at `t`.
	 *
	 * `t` should be a number in `[0, 1]`.
	 */
	public override at(t: number): Point2 {
		if (t === 0) return this.p0;
		if (t === 1) return this.p2;

		const p0 = this.p0;
		const p1 = this.p1;
		const p2 = this.p2;
		return Vec2.of(
			QuadraticBezier.componentAt(t, p0.x, p1.x, p2.x),
			QuadraticBezier.componentAt(t, p0.y, p1.y, p2.y),
		);
	}

	public override derivativeAt(t: number): Point2 {
		const p0 = this.p0;
		const p1 = this.p1;
		const p2 = this.p2;
		return Vec2.of(
			QuadraticBezier.derivativeComponentAt(t, p0.x, p1.x, p2.x),
			QuadraticBezier.derivativeComponentAt(t, p0.y, p1.y, p2.y),
		);
	}

	public override secondDerivativeAt(t: number): Point2 {
		const p0 = this.p0;
		const p1 = this.p1;
		const p2 = this.p2;
		return Vec2.of(
			QuadraticBezier.secondDerivativeComponentAt(t, p0.x, p1.x, p2.x),
			QuadraticBezier.secondDerivativeComponentAt(t, p0.y, p1.y, p2.y),
		);
	}

	public override normal(t: number): Vec2 {
		const tangent = this.derivativeAt(t);
		return tangent.orthog().normalized();
	}

	/** @returns an overestimate of this shape's bounding box. */
	public override getLooseBoundingBox(): Rect2 {
		return Rect2.bboxOf([this.p0, this.p1, this.p2]);
	}

	/**
	 * @returns the *approximate* distance from `point` to this curve.
	 */
	public approximateDistance(point: Point2): number {
		// We want to minimize f(t) = |B(t) - p|².
		// Expanding,
		//   f(t)  = (Bₓ(t) - pₓ)² + (Bᵧ(t) - pᵧ)²
		// ⇒ f'(t) = Dₜ(Bₓ(t) - pₓ)² + Dₜ(Bᵧ(t) - pᵧ)²
		//
		// Considering just one component,
		//  Dₜ(Bₓ(t) - pₓ)² = 2(Bₓ(t) - pₓ)(DₜBₓ(t))
		//                  = 2(Bₓ(t)DₜBₓ(t) - pₓBₓ(t))
		//   = 2(p0ₓ + (t)(-2p0ₓ + 2p1ₓ) + (t²)(p0ₓ - 2p1ₓ + p2ₓ) - pₓ)((-2p0ₓ + 2p1ₓ) + 2(t)(p0ₓ - 2p1ₓ + p2ₓ))
		//     - (pₓ)((-2p0ₓ + 2p1ₓ) + (t)(p0ₓ - 2p1ₓ + p2ₓ))
		const A = this.p0.x - point.x;
		const B = -2 * this.p0.x + 2 * this.p1.x;
		const C = this.p0.x - 2 * this.p1.x + this.p2.x;
		// Let A = p0ₓ - pₓ, B = -2p0ₓ + 2p1ₓ, C = p0ₓ - 2p1ₓ + p2ₓ. We then have,
		//  Dₜ(Bₓ(t) - pₓ)²
		//    = 2(A + tB + t²C)(B + 2tC) - (pₓ)(B + 2tC)
		//    = 2(AB + tB² + t²BC + 2tCA + 2tCtB + 2tCt²C) - pₓB - pₓ2tC
		//    = 2(AB + tB² + 2tCA + t²BC + 2t²CB + 2C²t³) - pₓB - pₓ2tC
		//    = 2AB + 2t(B² + 2CA) + 2t²(BC + 2CB) + 4C²t³ - pₓB - pₓ2tC
		//    = 2AB + 2t(B² + 2CA - pₓC) + 2t²(BC + 2CB) + 4C²t³ - pₓB
		//

		const D = this.p0.y - point.y;
		const E = -2 * this.p0.y + 2 * this.p1.y;
		const F = this.p0.y - 2 * this.p1.y + this.p2.y;
		// Using D = p0ᵧ - pᵧ, E = -2p0ᵧ + 2p1ᵧ, F = p0ᵧ - 2p1ᵧ + p2ᵧ, we thus have,
		//  f'(t) = 2AB + 2t(B² + 2CA - pₓC) + 2t²(BC + 2CB) + 4C²t³ - pₓB
		//        + 2DE + 2t(E² + 2FD - pᵧF) + 2t²(EF + 2FE) + 4F²t³ - pᵧE
		const a = 2 * A * B + 2 * D * E - point.x * B - point.y * E;
		const b = 2 * B * B + 2 * E * E + 2 * C * A + 2 * F * D - point.x * C - point.y * F;
		const c = 2 * E * F + 2 * B * C + 2 * C * B + 2 * F * E;
		//const d = 4 * C * C + 4 * F * F;

		// Thus,
		// f'(t) = a + bt + ct² + dt³
		const fDerivAtZero = a;
		const f2ndDerivAtZero = b;
		const f3rdDerivAtZero = 2 * c;

		// Using the first few terms of a Maclaurin series to approximate f'(t),
		// f'(t) ≈ f'(0) + t f''(0) + t² f'''(0) / 2
		let [min1, min2] = solveQuadratic(f3rdDerivAtZero / 2, f2ndDerivAtZero, fDerivAtZero);

		// If the quadratic has no solutions, approximate.
		if (isNaN(min1)) {
			min1 = 0.25;
		}

		if (isNaN(min2)) {
			min2 = 0.75;
		}

		const at1 = this.at(min1);
		const at2 = this.at(min2);
		const sqrDist1 = at1.squareDistanceTo(point);
		const sqrDist2 = at2.squareDistanceTo(point);
		const sqrDist3 = this.at(0).squareDistanceTo(point);
		const sqrDist4 = this.at(1).squareDistanceTo(point);

		return Math.sqrt(Math.min(sqrDist1, sqrDist2, sqrDist3, sqrDist4));
	}

	public override getPoints() {
		return [this.p0, this.p1, this.p2];
	}
}
export default QuadraticBezier;
