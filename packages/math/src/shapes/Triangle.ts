import Mat33 from '../Mat33';
import { Point2 } from '../Vec2';
import Vec3 from '../Vec3';
import Abstract2DShape from './Abstract2DShape';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';

type TriangleBoundary = [LineSegment2, LineSegment2, LineSegment2];

export default class Triangle extends Abstract2DShape {
	/**
	 * @see {@link fromVertices}
	 */
	protected constructor(
		public readonly vertex1: Vec3,
		public readonly vertex2: Vec3,
		public readonly vertex3: Vec3,
	) {
		super();
	}

	/**
	 * Creates a triangle from its three corners. Corners may be stored in a different
	 * order than given.
	 */
	public static fromVertices(vertex1: Vec3, vertex2: Vec3, vertex3: Vec3) {
		return new Triangle(vertex1, vertex2, vertex3);
	}

	public get vertices(): [Point2, Point2, Point2] {
		return [this.vertex1, this.vertex2, this.vertex3];
	}

	public map(mapping: (vertex: Vec3) => Vec3): Triangle {
		return new Triangle(mapping(this.vertex1), mapping(this.vertex2), mapping(this.vertex3));
	}

	// Transform, treating this as composed of 2D points.
	public transformed2DBy(affineTransform: Mat33) {
		return this.map((vertex) => affineTransform.transformVec2(vertex));
	}

	// Transforms this by a linear transform --- verticies are treated as
	// 3D points.
	public transformedBy(linearTransform: Mat33) {
		return this.map((vertex) => linearTransform.transformVec3(vertex));
	}

	#sides: TriangleBoundary | undefined = undefined;

	/**
	 * Returns the sides of this triangle, as an array of `LineSegment2`s.
	 *
	 * The first side is from `vertex1` to `vertex2`, the next from `vertex2` to `vertex3`,
	 * and the last from `vertex3` to `vertex1`.
	 */
	public getEdges(): TriangleBoundary {
		if (this.#sides) {
			return this.#sides;
		}

		const side1 = new LineSegment2(this.vertex1, this.vertex2);
		const side2 = new LineSegment2(this.vertex2, this.vertex3);
		const side3 = new LineSegment2(this.vertex3, this.vertex1);

		const sides: TriangleBoundary = [side1, side2, side3];
		this.#sides = sides;
		return sides;
	}

	public override intersectsLineSegment(lineSegment: LineSegment2): Vec3[] {
		const result: Point2[] = [];

		for (const edge of this.getEdges()) {
			edge.intersectsLineSegment(lineSegment).forEach((point) => result.push(point));
		}

		return result;
	}

	/** @inheritdoc */
	public override containsPoint(
		point: Vec3,
		epsilon: number = Abstract2DShape.smallValue,
	): boolean {
		// Project `point` onto normals to each of this' sides.
		// Uses the Separating Axis Theorem (https://en.wikipedia.org/wiki/Hyperplane_separation_theorem#Use_in_collision_detection)
		const sides = this.getEdges();

		for (const side of sides) {
			const orthog = side.direction.orthog();

			// Project all three vertices
			// TODO: Performance can be improved here (two vertices will always have the same projection)
			const projv1 = orthog.dot(this.vertex1);
			const projv2 = orthog.dot(this.vertex2);
			const projv3 = orthog.dot(this.vertex3);

			const minProjVertex = Math.min(projv1, projv2, projv3);
			const maxProjVertex = Math.max(projv1, projv2, projv3);

			const projPoint = orthog.dot(point);

			const inProjection =
				projPoint >= minProjVertex - epsilon && projPoint <= maxProjVertex + epsilon;
			if (!inProjection) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @returns the signed distance from `point` to the closest edge of this triangle.
	 *
	 * If `point` is inside `this`, the result is negative, otherwise, the result is
	 * positive.
	 */
	public override signedDistance(point: Vec3): number {
		const sides = this.getEdges();
		const distances = sides.map((side) => side.distance(point));
		const distance = Math.min(...distances);

		// If the point is in this' interior, signedDistance must return a negative
		// number.
		if (this.containsPoint(point, 0)) {
			return -distance;
		} else {
			return distance;
		}
	}

	/** @inheritdoc */
	public override getTightBoundingBox(): Rect2 {
		return Rect2.bboxOf(this.vertices);
	}
}
