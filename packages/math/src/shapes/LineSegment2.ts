import Mat33 from '../Mat33';
import Rect2 from './Rect2';
import { Vec2, Point2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';

interface IntersectionResult {
	point: Point2;
	t: number;
}

/** Represents a line segment. A `LineSegment2` is immutable. */
export default class LineSegment2 extends Abstract2DShape {
	// invariant: ||direction|| = 1

	/**
	 * The **unit** direction vector of this line segment, from
	 * `point1` to `point2`.
	 *
	 * In other words, `direction` is `point2.minus(point1).normalized()`
	 * (perhaps except when `point1` is equal to `point2`).
	 */
	public readonly direction: Vec2;

	/** The distance between `point1` and `point2`. */
	public readonly length: number;

	/** The bounding box of this line segment. */
	public readonly bbox;

	/** Creates a new `LineSegment2` from its endpoints. */
	public constructor(
		private readonly point1: Point2,
		private readonly point2: Point2
	) {
		super();

		this.bbox = Rect2.bboxOf([point1, point2]);

		this.direction = point2.minus(point1);
		this.length = this.direction.magnitude();

		// Normalize
		if (this.length > 0) {
			this.direction = this.direction.times(1 / this.length);
		}
	}

	// Accessors to make LineSegment2 compatible with bezier-js's
	// interface

	/** Alias for `point1`. */
	public get p1(): Point2 {
		return this.point1;
	}

	/** Alias for `point2`. */
	public get p2(): Point2 {
		return this.point2;
	}

	/**
	 * Gets a point a distance `t` along this line.
	 *
	 * @deprecated
	 */
	public get(t: number): Point2 {
		return this.point1.plus(this.direction.times(t));
	}

	/**
	 * Returns a point a fraction, `t`, along this line segment.
	 * Thus, `segment.at(0)` returns `segment.p1` and `segment.at(1)` returns
	 * `segment.p2`.
	 *
	 * `t` should be in `[0, 1]`.
	 */
	public at(t: number): Point2 {
		return this.get(t * this.length);
	}

	public intersection(other: LineSegment2): IntersectionResult|null {
		// We want x₁(t) = x₂(t) and y₁(t) = y₂(t)
		// Observe that
		// x = this.point1.x + this.direction.x · t₁
		//   = other.point1.x + other.direction.x · t₂
		// Thus,
		//  t₁ = (x - this.point1.x) / this.direction.x
		//     = (y - this.point1.y) / this.direction.y
		// and
		//  t₂ = (x - other.point1.x) / other.direction.x
		// (and similarly for y)
		//
		// Letting o₁ₓ = this.point1.x, o₂ₓ = other.point1.x,
		//         d₁ᵧ = this.direction.y, ...
		//
		// We can substitute these into the equations for y:
		// y = o₁ᵧ + d₁ᵧ · (x - o₁ₓ) / d₁ₓ
		//   = o₂ᵧ + d₂ᵧ · (x - o₂ₓ) / d₂ₓ
		// ⇒ o₁ᵧ - o₂ᵧ = d₂ᵧ · (x - o₂ₓ) / d₂ₓ - d₁ᵧ · (x - o₁ₓ) / d₁ₓ
		//            = (d₂ᵧ/d₂ₓ)(x) - (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(x) + (d₁ᵧ/d₁ₓ)(o₁ₓ)
		//            = (x)(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ) - (d₂ᵧ/d₂ₓ)(o₂ₓ) + (d₁ᵧ/d₁ₓ)(o₁ₓ)
		// ⇒ (x)(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ) = o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ)
		// ⇒ x = (o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ))/(d₂ᵧ/d₂ₓ - d₁ᵧ/d₁ₓ)
		//     = (d₁ₓd₂ₓ)(o₁ᵧ - o₂ᵧ + (d₂ᵧ/d₂ₓ)(o₂ₓ) - (d₁ᵧ/d₁ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
		//     = ((o₁ᵧ - o₂ᵧ)((d₁ₓd₂ₓ)) + (d₂ᵧd₁ₓ)(o₂ₓ) - (d₁ᵧd₂ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
		// ⇒ y = o₁ᵧ + d₁ᵧ · (x - o₁ₓ) / d₁ₓ = ...
		let resultPoint, resultT;
		if (this.direction.x === 0) {
			// Vertical line: Where does the other have x = this.point1.x?
			// x = o₁ₓ = o₂ₓ + d₂ₓ · (y - o₂ᵧ) / d₂ᵧ
			// ⇒ (o₁ₓ - o₂ₓ)(d₂ᵧ/d₂ₓ) + o₂ᵧ = y

			// Avoid division by zero
			if (other.direction.x === 0 || this.direction.y === 0) {
				return null;
			}

			const xIntersect = this.point1.x;
			const yIntersect =
				(this.point1.x - other.point1.x) * other.direction.y / other.direction.x + other.point1.y;
			resultPoint = Vec2.of(xIntersect, yIntersect);
			resultT = (yIntersect - this.point1.y) / this.direction.y;
		} else {
			// From above,
			// x = ((o₁ᵧ - o₂ᵧ)(d₁ₓd₂ₓ) + (d₂ᵧd₁ₓ)(o₂ₓ) - (d₁ᵧd₂ₓ)(o₁ₓ))/(d₂ᵧd₁ₓ - d₁ᵧd₂ₓ)
			const numerator = (
				(this.point1.y - other.point1.y) * this.direction.x * other.direction.x
				+ this.direction.x * other.direction.y * other.point1.x
				- this.direction.y * other.direction.x * this.point1.x
			);
			const denominator = (
				other.direction.y * this.direction.x
				- this.direction.y * other.direction.x
			);

			// Avoid dividing by zero. It means there is no intersection
			if (denominator === 0) {
				return null;
			}

			const xIntersect = numerator / denominator;
			const t1 = (xIntersect - this.point1.x) / this.direction.x;
			const yIntersect = this.point1.y + this.direction.y * t1;
			resultPoint = Vec2.of(xIntersect, yIntersect);
			resultT = (xIntersect - this.point1.x) / this.direction.x;
		}

		// Ensure the result is in this/the other segment.
		const resultToP1 = resultPoint.minus(this.point1).magnitude();
		const resultToP2 = resultPoint.minus(this.point2).magnitude();
		const resultToP3 = resultPoint.minus(other.point1).magnitude();
		const resultToP4 = resultPoint.minus(other.point2).magnitude();
		if (resultToP1 > this.length
			|| resultToP2 > this.length
			|| resultToP3 > other.length
			|| resultToP4 > other.length) {
			return null;
		}

		return {
			point: resultPoint,
			t: resultT,
		};
	}

	public intersects(other: LineSegment2) {
		return this.intersection(other) !== null;
	}

	/**
	 * Returns the points at which this line segment intersects the
	 * given line segment.
	 *
	 * Note that {@link intersects} returns *whether* this line segment intersects another
	 * line segment. This method, by contrast, returns **the point** at which the intersection
	 * occurs, if such a point exists.
	 */
	public override intersectsLineSegment(lineSegment: LineSegment2) {
		const intersection = this.intersection(lineSegment);

		if (intersection) {
			return [ intersection.point ];
		}
		return [];
	}

	// Returns the closest point on this to [target]
	public closestPointTo(target: Point2) {
		// Distance from P1 along this' direction.
		const projectedDistFromP1 = target.minus(this.p1).dot(this.direction);
		const projectedDistFromP2 = this.length - projectedDistFromP1;

		const projection = this.p1.plus(this.direction.times(projectedDistFromP1));

		if (projectedDistFromP1 > 0 && projectedDistFromP1 < this.length) {
			return projection;
		}

		if (Math.abs(projectedDistFromP2) < Math.abs(projectedDistFromP1)) {
			return this.p2;
		} else {
			return this.p1;
		}
	}

	/**
	 * Returns the distance from this line segment to `target`.
	 *
	 * Because a line segment has no interior, this signed distance is equivalent to
	 * the full distance between `target` and this line segment.
	 */
	public signedDistance(target: Point2) {
		return this.closestPointTo(target).minus(target).magnitude();
	}

	/** Returns a copy of this line segment transformed by the given `affineTransfm`. */
	public transformedBy(affineTransfm: Mat33): LineSegment2 {
		return new LineSegment2(
			affineTransfm.transformVec2(this.p1), affineTransfm.transformVec2(this.p2)
		);
	}

	/** @inheritdoc */
	public override getTightBoundingBox(): Rect2 {
		return this.bbox;
	}

	public override toString() {
		return `LineSegment(${this.p1.toString()}, ${this.p2.toString()})`;
	}
}
