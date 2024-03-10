import LineSegment2 from './LineSegment2';
import { Point2 } from '../Vec2';
import Rect2 from './Rect2';

/**
 * An abstract base class for 2D shapes.
 */
export abstract class Abstract2DShape {
	// @internal
	protected static readonly smallValue = 1e-12;

	/**
	 * @returns the distance from `point` to this shape. If `point` is within this shape,
	 * this returns the distance from `point` to the edge of this shape.
	 *
	 * @see {@link signedDistance}
	 */
	public distance(point: Point2) {
		return Math.abs(this.signedDistance(point));
	}

	/**
	 * Computes the [signed distance function](https://en.wikipedia.org/wiki/Signed_distance_function)
	 * for this shape.
	 */
	public abstract signedDistance(point: Point2): number;

	/**
	 * @returns points at which this shape intersects the given `lineSegment`.
	 *
	 * If this is a closed shape, returns points where the given `lineSegment` intersects
	 * the **boundary** of this.
	 */
	public abstract intersectsLineSegment(lineSegment: LineSegment2): Point2[];

	/**
	 * Returns `true` if and only if the given `point` is contained within this shape.
	 *
	 * `epsilon` is a small number used to counteract floating point error. Thus, if
	 * `point` is within `epsilon` of the inside of this shape, `containsPoint` may also
	 * return `true`.
	 *
	 * The default implementation relies on `signedDistance`.
	 * Subclasses may override this method to provide a more efficient implementation.
	 */
	public containsPoint(point: Point2, epsilon: number = Abstract2DShape.smallValue): boolean {
		return this.signedDistance(point) < epsilon;
	}

	/**
	 * Returns a bounding box that precisely fits the content of this shape.
	 *
	 * **Note**: This bounding box should aligned with the x/y axes. (Thus, it may be
	 * possible to find a tighter bounding box not axes-aligned).
	 */
	public abstract getTightBoundingBox(): Rect2;

	/**
	 * Returns a bounding box that **loosely** fits the content of this shape.
	 *
	 * The result of this call can be larger than the result of {@link getTightBoundingBox},
	 * **but should not be smaller**. Thus, a call to `getLooseBoundingBox` can be significantly
	 * faster than a call to {@link getTightBoundingBox} for some shapes.
	 */
	public getLooseBoundingBox(): Rect2 {
		return this.getTightBoundingBox();
	}
}

export default Abstract2DShape;
