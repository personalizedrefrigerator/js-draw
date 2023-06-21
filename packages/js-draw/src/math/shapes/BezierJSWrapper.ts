import { Bezier } from 'bezier-js';
import { Point2, Vec2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';

/**
 * A lazy-initializing wrapper around Bezier-js.
 *
 * Subclasses may override `at`, `derivativeAt`, and `normal` with functions
 * that do not initialize a `bezier-js` `Bezier`.
 *
 * Do not use this class directly. It may be removed/replaced in a future release.
 * @internal
 */
abstract class BezierJSWrapper extends Abstract2DShape {
	#bezierJs: Bezier|null = null;

	/** Returns the start, control points, and end point of this Bézier. */
	public abstract getPoints(): Point2[];

	protected getBezier() {
		if (!this.#bezierJs) {
			this.#bezierJs = new Bezier(this.getPoints().map(p => p.xy));
		}
		return this.#bezierJs;
	}

	public override signedDistance(point: Point2): number {
		// .d: Distance
		return this.getBezier().project(point.xy).d!;
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
	public at(t: number): Point2 {
		return Vec2.ofXY(this.getBezier().get(t));
	}

	public derivativeAt(t: number): Point2 {
		return Vec2.ofXY(this.getBezier().derivative(t));
	}

	public normal(t: number): Vec2 {
		return Vec2.ofXY(this.getBezier().normal(t));
	}

	public override getTightBoundingBox(): Rect2 {
		const bbox = this.getBezier().bbox();
		const width = bbox.x.max - bbox.x.min;
		const height = bbox.y.max - bbox.y.min;

		return new Rect2(bbox.x.min, bbox.y.min, width, height);
	}

	public override intersectsLineSegment(line: LineSegment2): Point2[] {
		const bezier = this.getBezier();

		const intersectionPoints = bezier.intersects(line).map(t => {
			// We're using the .intersects(line) function, which is documented
			// to always return numbers. However, to satisfy the type checker (and
			// possibly improperly-defined types),
			if (typeof t === 'string') {
				t = parseFloat(t);
			}

			const point = Vec2.ofXY(bezier.get(t));

			// Ensure that the intersection is on the line segment
			if (point.minus(line.p1).magnitude() > line.length
					|| point.minus(line.p2).magnitude() > line.length) {
				return null;
			}

			return point;
		}).filter(entry => entry !== null) as Point2[];

		return intersectionPoints;
	}
}

export default BezierJSWrapper;