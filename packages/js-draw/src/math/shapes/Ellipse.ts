import Mat33 from '../Mat33';
import { Point2, Vec2 } from '../Vec2';
import Vec3 from '../Vec3';
import solveQuadratic from '../polynomial/solveQuadratic';
import Abstract2DShape from './Abstract2DShape';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';

/**
 * We define an ellipse with two foci, `f1` and `f2`, and a distance, `rx`.
 *
 * The ellipse is the set `{ p ∈ ℝ² : ‖f1 - p‖ + ‖f2 - p‖ = 2rx }`.
 *
 * We call `rx` the **semimajor axis** and `2rx` the **major axis**.
 */
class Ellipse extends Abstract2DShape {
	/** Center of the ellipse: The point between its two foci. */
	public readonly center: Point2;

	/** Length of the semiminor axis */
	public readonly ry: number;

	/** Angle the ellipse is rotated (counter clockwise, radians). */
	public readonly angle: number;

	/**
	 * Transformation from the unit circle to this ellipse. As such,
	 *     `this.transform @ point`
	 * for `point` on the unit circle produces a point on this ellipse.
	 */
	public readonly transform: Mat33;


	/**
	 * Creates a new Ellipse ([about ellipses](https://mathworld.wolfram.com/Ellipse.html)).
	 *
	 * @param f1 Position of the first focus
	 * @param f2 Position of the second focus
	 * @param rx Length of the semimajor axis
	 */
	public constructor(
		// Focus 1
		public readonly f1: Point2,

		// Focus 2
		public readonly f2: Point2,

		// Length of the semimajor axis
		public readonly rx: number,
	) {
		super();

		// The center is halfway between f1 and f2.
		this.center = f1.lerp(f2, 0.5);

		// With a point on the (rotated) y axis, the lines from the foci to the
		// point form two symmetric triangles:
		//       /|\
		//      / | \
		//     /  |ry\
		//    /   |   \
		//  f1▔▔▔▔▔▔▔▔▔f2
		//      l    l
		//
		// l² + ry² = a² ⟹ ry² = a² - l².
		//
		// Because the point is on the ellipse,
		//    a + a = 2rx ⟹ a = rx.
		// Thus,
		//    ry² = rx² - l²
		const l = this.center.minus(f1).length();
		this.ry = Math.sqrt(this.rx * this.rx - l * l);

		// Angle between the x-axis in the XY plane and the major axis of this ellipse.
		this.angle = this.f2.minus(this.center).angle();

		// Transforms a point on the unit circle to this ellipse.
		this.transform = Mat33.translation(this.center).rightMul(
			Mat33.zRotation(this.angle)
		).rightMul(
			Mat33.scaling2D(Vec2.of(this.rx, this.ry))
		);
	}

	// public static fromTransform(
	// 	transform: Mat33,
	// ) {
	// 	// See https://math.stackexchange.com/a/2147944

	// 	const xAxis = Vec2.unitX;
	// 	const yAxis = Vec2.unitY;
	// 	const zero = Vec2.zero;

	// 	const center = transform.transformVec2(zero);
	// 	const right = transform.transformVec3(xAxis);
	// 	const top = transform.transformVec3(yAxis);

	// 	// The two foci lie along the longer axis.
	// 	// rx is half the length of this longer axis.

	// 	//   (rx-ℓ) ℓ   ℓ  (rx-ℓ)
	// 	//  |-----x---o---x-----|
	// 	//       f1      f2
	// 	// where ℓ is the distance between the foci.

	// 	const upVec = top.minus(center);
	// 	const rightVec = right.minus(center);

	// 	const ry = Math.min(upVec.length(), rightVec.length());
	// 	const rx = Math.max(upVec.length(), rightVec.length());

	// 	// Choose the x-axis to be the longer of the two axes

	// 	let f1, f2;
	// 	if (top.length() > right.length()) {
	// 		f1 = center.plus();
	// 	} else {
	// 		;
	// 	}
	// }

	/**
	 * @returns a point on this ellipse, given a parameter value, `t ∈ [0, 2π)`.
	 *
	 * Because `t` is treated as an angle, `at(3π)` is equivalent to `at(π)`. Thus,
	 * `at(a + 2πk) = at(a)` for all `k ∈ ℤ`.
	 */
	public at(t: number) {
		// See https://math.stackexchange.com/q/2645689

		// Start with an unrotated ellipse:
		//   v₀(t) = (rx * cos(t), ry * sin(t))
		// Rotate it:
		//
		//            ((cos ϑ, -sin ϑ)
		//   v₁(t) =   (sin ϑ,  cos ϑ))  *  v₀(t)
		//
		//         = (rx (cos ϑ)(cos t) - ry (sin ϑ)(sin t),
		//            rx (sin ϑ)(cos t) + ry (sin t)(cos ϑ)).
		//
		// Finally, center it:
		//   v(t) = v₁(t) + center
		const cosAngle = Math.cos(this.angle);
		const sinAngle = Math.sin(this.angle);
		const sint = Math.sin(t);
		const cost = Math.cos(t);
		return Vec2.of(
			this.rx * cosAngle * cost - this.ry * sint * sinAngle,
			this.rx * sinAngle * cost + this.ry * sint * cosAngle,
		).plus(this.center);
	}

	public derivativeAt(t: number) {
		const cosAngle = Math.cos(this.angle);
		const sinAngle = Math.sin(this.angle);
		const sint = Math.sin(t);
		const cost = Math.cos(t);
		return Vec2.of(
			this.rx * cosAngle * (-sint) - this.ry * cost * sinAngle,
			this.rx * sinAngle * (-sint) + this.ry * cost * cosAngle
		);
	}

	/**
	 * Returns the parameter value that produces the given `point`.
	 *
	 * `point` should be a point on this ellipse. If it is not, returns `null`.
	 */
	public parameterForPoint(point: Point2): number|null {
		if (!this.containsPoint(point)) {
			return null;
		}

		return this.parameterForPointUnchecked(point);
	}

	/**
	 * Like {@link parameterForPoint}, but does not verify that `point` is on this
	 * ellipse.
	 */
	public parameterForPointUnchecked(point: Point2) {
		const pointOnCircle = this.transform.inverse().transformVec2(point);
		return pointOnCircle.angle();
	}

	/**
	 * Returns the points on this ellipse with minimum/maximum x/y values.
	 *
	 * Return values are in the form
	 * ```
	 *  [
	 * 		point with minimum X,
	 * 		point with maximum X,
	 * 		point with minimum Y,
	 * 		point with maximum Y,
	 *  ]
	 * ```
	 */
	public getXYExtrema(): [ Point2, Point2, Point2, Point2 ] {
		const cosAngle = Math.cos(this.angle);
		const sinAngle = Math.sin(this.angle);

		// See https://www.desmos.com/calculator/dpj1wrif16
		//
		// At extrema, derivativeAt(t) has a zero x or y component. Thus,
		// for angle = α, yComponent(t) = 0 and thus,
		//      rx * sin(α) * (-sin t) + ry * cos t * cos(α) = 0
		//  ⟹ rx (sin α) (sin t) = ry (cos t) (cos α)
		//  ⟹ (sin t)         = (ry (cos t)(cos α)) / (rx (sin α))
		//  ⟹ (sin t)/(cos t) = (ry (cos α)) / (rx (sin α))
		//  ⟹            t    = Arctan2(ry (cos α), rx (sin α)) ± 2πk
		const yExtremaT = Math.atan2(this.ry * cosAngle, this.rx * sinAngle);
		let yExtrema1 = this.at(yExtremaT);
		let yExtrema2 = this.at(yExtremaT + Math.PI);

		if (yExtrema1.y > yExtrema2.y) {
			const tmp = yExtrema1;
			yExtrema1 = yExtrema2;
			yExtrema2 = tmp;
		}

		// Similarly, for angle α, xComponent(t) = 0, thus,
		//     rx (cos α) (-sin t) - ry (sin α) (cos t) = 0
		// ⟹  rx (cos α) (-sin t) = ry (sin α) (cos t)
		// ⟹          -sin t      = ry (cos t) (sin α) / (rx (cos α))
		// ⟹     -(sin t)/(cos t) = ry (sin α) / (rx cos α)
		// ⟹             tan t    = -ry (sin α) / (rx cos α)
		const xExtremaT = Math.atan2(-this.ry * sinAngle, this.rx * cosAngle);
		let xExtrema1 = this.at(xExtremaT);
		let xExtrema2 = this.at(xExtremaT + Math.PI);

		if (xExtrema1.x > xExtrema2.x) {
			const tmp = xExtrema1;
			xExtrema1 = xExtrema2;
			xExtrema2 = tmp;
		}

		return [ xExtrema1, xExtrema2, yExtrema1, yExtrema2 ];
	}

	/** @inheritdoc */
	public override getTightBoundingBox(): Rect2 {
		return Rect2.bboxOf(this.getXYExtrema());
	}


	/**
	 * Returns the points (if any) at which the line containing `line` intersects
	 * this.
	 */
	private lineIntersections(line: LineSegment2): [Point2, Point2]|null {
		// Convert the segment into something in the space of the unit circle for
		// easier math.
		const segInCircleSpace = line.transformedBy(this.transform.inverse());

		// Intersect segInCircleSpace with the unit circle:
		//
		// The unit circle satisfies x² + y² = 1 for all x, y in the circle.
		// Thus, where the line segment intersects the circle,
		//        1 = (x(t))² + (y(t))²
		//          = (x₀ + vₓt)² + (y₀ + vᵧt)²      <-- for v = segInCircleSpace.direction
		//          = x₀² + 2x₀vₓt + vₓ²t² + y₀² + 2y₀vᵧt + vᵧ²t²
		//          = vₓ²t² + vᵧ²t² + 2x₀vₓt + 2y₀vᵧt + x₀² + y₀²
		//    ⟹ 0 = (t²)(vₓ² + vᵧ²) + (t)(2x₀vₓ + 2y₀vᵧ) + x₀² + y₀² - 1
		// Hence, we solve a quadratic for t:
		const v = segInCircleSpace.direction;
		const p1 = segInCircleSpace.p1;
		const a = v.x * v.x + v.y * v.y;
		const b = 2 * p1.x * v.x + 2 * p1.y * v.y;
		const c = p1.x * p1.x + p1.y * p1.y - 1;

		const [ lineParam1, lineParam2 ] = solveQuadratic(a, b, c);

		// No solutions?
		if (isNaN(lineParam1) || isNaN(lineParam2)) {
			return null;
		}

		// Turn the line parameters into points:
		const sol1 = p1.plus(v.times(lineParam1));
		const sol2 = p1.plus(v.times(lineParam2));

		// Return solutions transformed back
		return [
			this.transform.transformVec2(sol1),
			this.transform.transformVec2(sol2),
		];
	}

	/**
	 * Returns the (at most two) parameter values for the intersection of the line containing
	 * the given segment with this.
	 *
	 * This returns two (possibly the same) parameter values, or null
	 * if the line containing `line` does not intersect this.
	 */
	private parmeterForLineIntersection(line: LineSegment2): [number, number]|null {
		const points = this.lineIntersections(line);

		if (!points) {
			return null;
		}

		const invTransform = this.transform.inverse();
		const unitCirclePoint1 = invTransform.transformVec2(points[0]);
		const unitCirclePoint2 = invTransform.transformVec2(points[1]);

		const param1 = unitCirclePoint1.angle();
		const param2 = unitCirclePoint2.angle();

		// Parameters remain the same under transformation
		return [ param1, param2 ];
	}

	public override intersectsLineSegment(lineSegment: LineSegment2): Point2[] {
		const intersectionsOnLine = this.lineIntersections(lineSegment);

		// No intersections
		if (intersectionsOnLine === null) {
			return [];
		}

		const intersectionsOnSeg = intersectionsOnLine
			.filter(p => lineSegment.containsPoint(p));

		if (intersectionsOnSeg.length === 2) {
			if (intersectionsOnSeg[0].eq(intersectionsOnSeg[1])) {
				return [ intersectionsOnSeg[0] ];
			}
		}

		return intersectionsOnSeg;
	}

	public getSemiMajorAxisDirection() {
		return this.f2.eq(this.center) ? Vec2.of(1, 0) : this.f2.minus(this.center).normalized();
	}

	public getSemiMinorAxisDirection() {
		return this.getSemiMajorAxisDirection().orthog();
	}

	public getSemiMinorAxisVec() {
		return this.getSemiMinorAxisDirection().times(this.ry);
	}

	public getSemiMajorAxisVec() {
		return this.getSemiMajorAxisDirection().times(this.rx);
	}

	/**
	 * Returns the closest point on this ellipse to `point`.
	 */
	public closestPointTo(point: Point2): Point2 {
		// Our initial guess below requires that point ≠ center. Thus, we need
		// an edge case.
		if (point.eq(this.center)) {
			const xAxisDir = this.getSemiMajorAxisDirection();
			if (this.rx < this.ry) {
				return this.center.plus(xAxisDir.times(this.rx));
			}
			return this.center.plus(xAxisDir.orthog().times(this.ry));
		}

		// Letting p be `point` and v(t) be a point on the ellipse given parameter t, observe that
		//    f(t) = ‖v(t) - p‖²
		// is the square distance from the point on the ellipse at parameter value t and p.
		//
		// Thus, letting q = p - center,
		//    f(t) = ‖(rx (cos ϑ)(cos t) - ry (sin ϑ)(sin t) + center.x - pₓ,
		//            rx (sin ϑ)(cos t) + ry (sin t)(cos ϑ) + center.y - pᵧ)‖²
		//         = ‖(rx (cos ϑ)(cos t) - ry (sin ϑ)(sin t) - qₓ,
		//            rx (sin ϑ)(cos t) + ry (sin t)(cos ϑ) - qᵧ)‖²
		//         = (rx (cos ϑ)(cos t) - ry (sin ϑ)(sin t) - qₓ)²
		//           + (rx (sin ϑ)(cos t) + ry (sin t)(cos ϑ) - qᵧ)².
		//
		// Hence,
		//   f'(t) = 2(rx (cos ϑ)(cos t) - ry (sin ϑ)(sin t) - qₓ)
		//                  (rx (cos ϑ)(-sin t) - ry (sin ϑ)(cos t))
		//           + 2(rx (sin ϑ)(cos t) + ry (sin t)(cos ϑ) - qᵧ)
		//                  (rx (sin ϑ)(-sin t) + ry (cos t)(cos ϑ))
		//         = 2 Δₓ(t) (rx (cos ϑ)(-sin t) - ry (sin ϑ)(cos t))
		//           + 2 Δᵧ(t) (rx (sin ϑ)(-sin t) + ry (cos t)(cos ϑ))
		//         = 2 Δₓ(t) rx (cos ϑ)(-sin t) - 2 Δₓ(t) ry (sin ϑ)(cos t))
		//           + 2 Δᵧ(t) rx (sin ϑ)(-sin t) + 2 Δᵧ(t) ry (cos t)(cos ϑ)
		// where Δ(t) = v(t) - p
		//
		// We want to find the t that minimizes the square distance. We can do this using gradient
		// descent.
		const loss = (t: number) => {
			return this.at(t).minus(point).magnitudeSquared();
		};

		const lossDerivative = (t: number) => {
			const v = this.at(t).minus(point);

			//  2 vₓ(t) (rx (cos ϑ)(-sin t) - ry (sin ϑ)(cos t))
			//+ 2 vᵧ(t) (rx (sin ϑ)(-sin t) + ry (cos t)(cos ϑ))
			const cost = Math.cos(t);
			const sint = Math.sin(t);
			const cosTheta = Math.cos(this.angle);
			const sinTheta = Math.sin(this.angle);
			return 2 * v.x * (this.rx * cosTheta * (-sint) - this.ry * sinTheta * cost)
				+ 2 * v.y * (this.rx * sinTheta * (-sint) + this.ry * cost * cosTheta);
		};

		const [ guess1, guess2 ] =
			this.parmeterForLineIntersection(new LineSegment2(this.center, point)) ?? [ 0, Math.PI ];

		// Choose the guess that produces the smallest loss
		const guess = loss(guess1) < loss(guess2) ? guess1 : guess2;

		// Gradient descent with 10 steps, by default:
		let steps = 10;
		// ... but no more than 100 steps.
		const maxSteps = 100;
		let learningRate = 1.5;
		let tApproximation = guess;
		let lastLoss = loss(tApproximation);
		for (let i = 0; i < steps && i < maxSteps; i ++) {
			const direction = lossDerivative(tApproximation);
			const newApproximation = tApproximation - learningRate * direction;

			const newLoss = loss(tApproximation);
			if (lastLoss >= newLoss) {
				tApproximation = newApproximation;
			} else {
				// Adjust the learning rate if necessary
				learningRate /= 10;

				// Take more steps to compensate for the smaller learning rate.
				steps += 4;
			}

			lastLoss = newLoss;
		}

		return this.at(tApproximation);
	}

	/**
	 * Returns the distance from the edge of this to `point`, or, if `point` is inside this,
	 * the negative of that distance.
	 */
	public override signedDistance(point: Point2): number {
		const dist = point.minus(this.closestPointTo(point)).length();

		// SDF is negative for points contained in the ellipse.
		if (this.containsPoint(point)) {
			return -dist;
		}
		return dist;
	}

	public override containsPoint(point: Vec3, epsilon: number = Abstract2DShape.smallValue): boolean {
		const distSum = this.f1.minus(point).magnitude() + this.f2.minus(point).magnitude();
		return distSum <= 2 * this.rx + epsilon;
	}

	public hasPointOnBoundary(point: Vec3, epsilon: number = Abstract2DShape.smallValue) {
		const distSum = this.f1.minus(point).magnitude() + this.f2.minus(point).magnitude();
		return distSum <= 2 * this.rx + epsilon && 2 * this.rx - epsilon <= distSum;
	}

	public override toString() {
		return `Ellipse { rx: ${this.rx}, f1: ${this.f1}, f2: ${this.f2} }`;
	}
}

export default Ellipse;
