import { Point2 } from '../Vec2';
import BezierJSWrapper from './BezierJSWrapper';
import Rect2 from './Rect2';

/**
 * A wrapper around [`bezier-js`](https://github.com/Pomax/bezierjs)'s cubic Bezier.
 */
class CubicBezier extends BezierJSWrapper {
	public constructor(
		// Start point
		public readonly p0: Point2,

		// Control point 1
		public readonly p1: Point2,

		// Control point 2
		public readonly p2: Point2,

		// End point
		public readonly p3: Point2,
	) {
		super();
	}

	public override getPoints() {
		return [this.p0, this.p1, this.p2, this.p3];
	}

	/** Returns an overestimate of this shape's bounding box. */
	public override getLooseBoundingBox(): Rect2 {
		return Rect2.bboxOf([this.p0, this.p1, this.p2, this.p3]);
	}
}

export default CubicBezier;
