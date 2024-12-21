import LineSegment2 from './LineSegment2';
import Mat33 from '../Mat33';
import { Point2, Vec2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';
import Vec3 from '../Vec3';

/** An object that can be converted to a {@link Rect2}. */
export interface RectTemplate {
	x: number;
	y: number;
	w?: number;
	h?: number;
	width?: number;
	height?: number;
}

/**
 * Represents a rectangle in 2D space, parallel to the XY axes.
 *
 * **Example**:
 * ```ts,runnable,console
 * import { Rect2, Vec2 } from '@js-draw/math';
 *
 * const rect = Rect2.fromCorners(
 *   Vec2.of(0, 0),
 *   Vec2.of(10, 10),
 * );
 * console.log('area', rect.area);
 * console.log('topLeft', rect.topLeft);
 * ```
 *
 * `invariant: w ≥ 0, h ≥ 0, immutable`
 */
export class Rect2 extends Abstract2DShape {
	// Derived state:

	// topLeft assumes up is -y
	public readonly topLeft: Point2;
	public readonly size: Vec2;
	public readonly area: number;

	public constructor(
		// Top left x coordinate
		public readonly x: number,
		// Top left y coordinate
		public readonly y: number,
		// Width
		public readonly w: number,
		// Height
		public readonly h: number,
	) {
		super();

		if (w < 0) {
			this.x += w;
			this.w = Math.abs(w);
		}

		if (h < 0) {
			this.y += h;
			this.h = Math.abs(h);
		}

		// Precompute/store vector forms.
		this.topLeft = Vec2.of(this.x, this.y);
		this.size = Vec2.of(this.w, this.h);
		this.area = this.w * this.h;
	}

	public translatedBy(vec: Vec2): Rect2 {
		return new Rect2(vec.x + this.x, vec.y + this.y, this.w, this.h);
	}

	// Returns a copy of this with the given size (but same top-left).
	public resizedTo(size: Vec2): Rect2 {
		return new Rect2(this.x, this.y, size.x, size.y);
	}

	public override containsPoint(other: Point2): boolean {
		return (
			this.x <= other.x &&
			this.y <= other.y &&
			this.x + this.w >= other.x &&
			this.y + this.h >= other.y
		);
	}

	/** @returns true iff `other` is completely within this `Rect2`. */
	public containsRect(other: Rect2): boolean {
		return (
			this.x <= other.x &&
			this.y <= other.y &&
			this.x + this.w >= other.x + other.w &&
			this.y + this.h >= other.y + other.h
		);
	}

	/**
	 * @returns true iff this and `other` overlap
	 */
	public intersects(other: Rect2): boolean {
		// Project along x/y axes.
		const thisMinX = this.x;
		const thisMaxX = thisMinX + this.w;
		const otherMinX = other.x;
		const otherMaxX = other.x + other.w;

		if (thisMaxX < otherMinX || thisMinX > otherMaxX) {
			return false;
		}

		const thisMinY = this.y;
		const thisMaxY = thisMinY + this.h;
		const otherMinY = other.y;
		const otherMaxY = other.y + other.h;

		if (thisMaxY < otherMinY || thisMinY > otherMaxY) {
			return false;
		}

		return true;
	}

	// Returns the overlap of this and [other], or null, if no such
	//          overlap exists
	public intersection(other: Rect2): Rect2 | null {
		if (!this.intersects(other)) {
			return null;
		}

		const topLeft = this.topLeft.zip(other.topLeft, Math.max);
		const bottomRight = this.bottomRight.zip(other.bottomRight, Math.min);

		return Rect2.fromCorners(topLeft, bottomRight);
	}

	// Returns a new rectangle containing both [this] and [other].
	public union(other: Rect2): Rect2 {
		return Rect2.union(this, other);
	}

	// Returns a the subdivision of this into [columns] columns
	// and [rows] rows. For example,
	//	 Rect2.unitSquare.divideIntoGrid(2, 2)
	//		-> [ Rect2(0, 0, 0.5, 0.5), Rect2(0.5, 0, 0.5, 0.5), Rect2(0, 0.5, 0.5, 0.5), Rect2(0.5, 0.5, 0.5, 0.5) ]
	// The rectangles are ordered in row-major order.
	public divideIntoGrid(columns: number, rows: number): Rect2[] {
		const result: Rect2[] = [];
		if (columns <= 0 || rows <= 0) {
			return result;
		}

		const eachRectWidth = this.w / columns;
		const eachRectHeight = this.h / rows;

		if (eachRectWidth === 0) {
			columns = 1;
		}
		if (eachRectHeight === 0) {
			rows = 1;
		}

		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < columns; i++) {
				const x = eachRectWidth * i + this.x;
				const y = eachRectHeight * j + this.y;
				result.push(new Rect2(x, y, eachRectWidth, eachRectHeight));
			}
		}
		return result;
	}

	// Returns a rectangle containing this and [point].
	// [margin] is the minimum distance between the new point and the edge
	// of the resultant rectangle.
	public grownToPoint(point: Point2, margin: number = 0): Rect2 {
		const otherRect = new Rect2(point.x - margin, point.y - margin, margin * 2, margin * 2);
		return this.union(otherRect);
	}

	// Returns this grown by [margin] in both the x and y directions.
	public grownBy(margin: number): Rect2 {
		if (margin === 0) {
			return this;
		}

		// Prevent width/height from being negative
		if (margin < 0) {
			const xMargin = -Math.min(-margin, this.w / 2);
			const yMargin = -Math.min(-margin, this.h / 2);

			return new Rect2(
				this.x - xMargin,
				this.y - yMargin,
				this.w + xMargin * 2,
				this.h + yMargin * 2,
			);
		}

		return new Rect2(this.x - margin, this.y - margin, this.w + margin * 2, this.h + margin * 2);
	}

	/**
	 * If this rectangle is smaller than `minSize`, returns a copy of this
	 * with a larger width/height.
	 *
	 * If smaller than `minSize`, padding is applied on both sides.
	 */
	public grownToSize(minSize: Vec2) {
		if (this.width >= minSize.x && this.height >= minSize.y) {
			return this;
		}

		const deltaWidth = Math.max(0, minSize.x - this.width);
		const deltaHeight = Math.max(0, minSize.y - this.height);

		return new Rect2(
			this.x - deltaWidth / 2,
			this.y - deltaHeight / 2,
			this.width + deltaWidth,
			this.height + deltaHeight,
		);
	}

	public getClosestPointOnBoundaryTo(target: Point2) {
		const closestEdgePoints = this.getEdges().map((edge) => {
			return edge.closestPointTo(target);
		});

		let closest: Point2 | null = null;
		let closestDist: number | null = null;
		for (const point of closestEdgePoints) {
			const dist = point.distanceTo(target);
			if (closestDist === null || dist < closestDist) {
				closest = point;
				closestDist = dist;
			}
		}
		return closest!;
	}

	/**
	 * Returns `true` iff all points in this rectangle are within `distance` from `point`:
	 *
	 * If $R$ is the set of points in this rectangle, returns `true` iff
	 * $$
	 * 	\forall {\bf a} \in R, \|\texttt{point} - {\bf a}\| < \texttt{radius}
	 * $$
	 */
	public isWithinRadiusOf(radius: number, point: Point2) {
		if (this.maxDimension > radius) {
			return false;
		}

		const squareRadius = radius * radius;
		return this.corners.every((corner) => corner.minus(point).magnitudeSquared() < squareRadius);
	}

	public get corners(): Point2[] {
		return [this.bottomRight, this.topRight, this.topLeft, this.bottomLeft];
	}

	public get maxDimension() {
		return Math.max(this.w, this.h);
	}

	public get minDimension() {
		return Math.min(this.w, this.h);
	}

	public get bottomRight() {
		return this.topLeft.plus(this.size);
	}

	public get topRight() {
		return this.bottomRight.plus(Vec2.of(0, -this.h));
	}

	public get bottomLeft() {
		return this.topLeft.plus(Vec2.of(0, this.h));
	}

	public get width() {
		return this.w;
	}

	public get height() {
		return this.h;
	}

	public get center() {
		return Vec2.of(this.x + this.w / 2, this.y + this.h / 2);
	}

	// Returns edges in the order
	// [ rightEdge, topEdge, leftEdge, bottomEdge ]
	public getEdges(): LineSegment2[] {
		const corners = this.corners;
		return [
			new LineSegment2(corners[0], corners[1]),
			new LineSegment2(corners[1], corners[2]),
			new LineSegment2(corners[2], corners[3]),
			new LineSegment2(corners[3], corners[0]),
		];
	}

	public override intersectsLineSegment(lineSegment: LineSegment2): Point2[] {
		const result: Point2[] = [];

		for (const edge of this.getEdges()) {
			const intersection = edge.intersectsLineSegment(lineSegment);
			intersection.forEach((point) => result.push(point));
		}

		return result;
	}

	public override signedDistance(point: Vec3): number {
		const closestBoundaryPoint = this.getClosestPointOnBoundaryTo(point);
		const dist = point.minus(closestBoundaryPoint).magnitude();

		if (this.containsPoint(point)) {
			return -dist;
		}
		return dist;
	}

	public override getTightBoundingBox(): Rect2 {
		return this;
	}

	// [affineTransform] is a transformation matrix that both scales and **translates**.
	// the bounding box of this' four corners after transformed by the given affine transformation.
	public transformedBoundingBox(affineTransform: Mat33): Rect2 {
		// Optimize transforming by the identity matrix (a common case).
		if (affineTransform === Mat33.identity) {
			return this;
		}

		return Rect2.bboxOf(this.corners.map((corner) => affineTransform.transformVec2(corner)));
	}

	/** @return true iff this is equal to `other ± tolerance` */
	public eq(other: Rect2, tolerance: number = 0): boolean {
		return this.topLeft.eq(other.topLeft, tolerance) && this.size.eq(other.size, tolerance);
	}

	public override toString(): string {
		return `Rect(point(${this.x}, ${this.y}), size(${this.w}, ${this.h}))`;
	}

	public static fromCorners(corner1: Point2, corner2: Point2) {
		return new Rect2(
			Math.min(corner1.x, corner2.x),
			Math.min(corner1.y, corner2.y),
			Math.abs(corner1.x - corner2.x),
			Math.abs(corner1.y - corner2.y),
		);
	}

	// Returns a box that contains all points in [points] with at least [margin]
	// between each point and the edge of the box.
	public static bboxOf(points: Point2[], margin: number = 0) {
		let minX = 0;
		let minY = 0;
		let maxX = 0;
		let maxY = 0;
		let isFirst = true;

		for (const point of points) {
			if (isFirst) {
				minX = point.x;
				minY = point.y;
				maxX = point.x;
				maxY = point.y;

				isFirst = false;
			}

			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return Rect2.fromCorners(
			Vec2.of(minX - margin, minY - margin),
			Vec2.of(maxX + margin, maxY + margin),
		);
	}

	// @returns a rectangle that contains all of the given rectangles, the bounding box
	//     of the given rectangles.
	public static union(...rects: Rect2[]): Rect2 {
		if (rects.length === 0) {
			return Rect2.empty;
		}

		const firstRect = rects[0];
		let minX: number = firstRect.x;
		let minY: number = firstRect.y;
		let maxX: number = firstRect.x + firstRect.w;
		let maxY: number = firstRect.y + firstRect.h;

		for (let i = 1; i < rects.length; i++) {
			const rect = rects[i];
			minX = Math.min(minX, rect.x);
			minY = Math.min(minY, rect.y);
			maxX = Math.max(maxX, rect.x + rect.w);
			maxY = Math.max(maxY, rect.y + rect.h);
		}

		return new Rect2(minX, minY, maxX - minX, maxY - minY);
	}

	public static of(template: RectTemplate) {
		const width = template.width ?? template.w ?? 0;
		const height = template.height ?? template.h ?? 0;
		return new Rect2(template.x, template.y, width, height);
	}

	public static empty = new Rect2(0, 0, 0, 0);
	public static unitSquare = new Rect2(0, 0, 1, 1);
}

export default Rect2;
