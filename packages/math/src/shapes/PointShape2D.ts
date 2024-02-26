import { Point2 } from '../Vec2';
import Vec3 from '../Vec3';
import LineSegment2 from './LineSegment2';
import Parameterized2DShape from './Parameterized2DShape';
import Rect2 from './Rect2';

/**
 * Like a {@link Point2}, but with additional functionality (e.g. SDF).
 *
 * Access the internal `Point2` using the `p` property.
 */
class PointShape2D extends Parameterized2DShape {
	public constructor(public readonly p: Point2) {
		super();
	}

	public override signedDistance(point: Vec3): number {
		return this.p.minus(point).magnitude();
	}

	public override intersectsLineSegment(lineSegment: LineSegment2, epsilon?: number): Vec3[] {
		if (lineSegment.containsPoint(this.p, epsilon)) {
			return [ this.p ];
		}
		return [ ];
	}

	public override getTightBoundingBox(): Rect2 {
		return new Rect2(this.p.x, this.p.y, 0, 0);
	}

	public override at(_t: number) {
		return this.p;
	}

	public override splitAt(_t: number): [PointShape2D] {
		return [this];
	}

	public override nearestPointTo(_point: Point2) {
		return {
			point: this.p,
			parameterValue: 0,
		};
	}
}

export default PointShape2D;