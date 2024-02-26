import { Point2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';

/** A 2-dimensional path with parameter interval $t \in [0, 1]$. */
export abstract class Parameterized2DShape extends Abstract2DShape {
	/** Returns this at a given parameter. $t \in [0, 1]$ */
	abstract at(t: number): Point2;

	/**
	 * Divides this shape into two separate shapes at parameter value $t$.
	 */
	abstract splitAt(t: number): [ Parameterized2DShape ] | [ Parameterized2DShape, Parameterized2DShape ];

	/**
	 * Returns the nearest point on `this` to `point` and the `parameterValue` at which
	 * that point occurs.
	 */
	abstract nearestPointTo(point: Point2): { point: Point2, parameterValue: number };
}

export default Parameterized2DShape;
