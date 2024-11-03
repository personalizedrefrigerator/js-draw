import { Point2, Vec2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';
import LineSegment2 from './LineSegment2';

/**
 * A 2-dimensional path with parameter interval $t \in [0, 1]$.
 *
 * **Note:** Avoid extending this class outside of `js-draw` --- new abstract methods
 * may be added between minor versions.
 */
export abstract class Parameterized2DShape extends Abstract2DShape {
	/** Returns this at a given parameter. $t \in [0, 1]$ */
	abstract at(t: number): Point2;

	/** Computes the unit normal vector at $t$. */
	abstract normalAt(t: number): Vec2;

	abstract tangentAt(t: number): Vec2;

	/**
	 * Divides this shape into two separate shapes at parameter value $t$.
	 */
	abstract splitAt(
		t: number,
	): [Parameterized2DShape] | [Parameterized2DShape, Parameterized2DShape];

	/**
	 * Returns the nearest point on `this` to `point` and the `parameterValue` at which
	 * that point occurs.
	 */
	abstract nearestPointTo(point: Point2): { point: Point2; parameterValue: number };

	/**
	 * Returns the **parameter values** at which `lineSegment` intersects this shape.
	 *
	 * See also {@link intersectsLineSegment}
	 */
	public abstract argIntersectsLineSegment(lineSegment: LineSegment2): number[];

	public override intersectsLineSegment(line: LineSegment2): Point2[] {
		return this.argIntersectsLineSegment(line).map((t) => this.at(t));
	}
}

export default Parameterized2DShape;
