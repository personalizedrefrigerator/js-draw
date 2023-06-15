import LineSegment2 from './LineSegment2';
import Mat33 from './Mat33';
import { Point2, Vec2 } from './Vec2';

/** An object that can be converted to a Rect2. */
export interface RectTemplate {
	x: number;
	y: number;
	w?: number;
	h?: number;
	width?: number;
	height?: number;
}

// invariant: w ≥ 0, h ≥ 0.
export default class Rect2 {
	// Derived state:

	// topLeft assumes up is -y
	public readonly topLeft: Point2;
	public readonly size: Vec2;
	public readonly bottomRight: Point2;
	public readonly center: Point2;
	public readonly area: number;

	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly w: number,
		public readonly h: number
	) {
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
		this.bottomRight = this.topLeft.plus(this.size);
		this.center = this.topLeft.plus(this.size.times(0.5));
		this.area = this.w * this.h;
	}

	public translatedBy(vec: Vec2): Rect2 {
		return new Rect2(vec.x + this.x, vec.y + this.y, this.w, this.h);
	}

	// Returns a copy of this with the given size (but same top-left).
	public resizedTo(size: Vec2): Rect2 {
		return new Rect2(this.x, this.y, size.x, size.y);
	}

	public containsPoint(other: Point2): boolean {
		return this.x <= other.x && this.y <= other.y
			&& this.x + this.w >= other.x && this.y + this.h >= other.y;
	}

	public containsRect(other: Rect2): boolean {
		return this.x <= other.x && this.y <= other.y
				&& this.bottomRight.x >= other.bottomRight.x
				&& this.bottomRight.y >= other.bottomRight.y;
	}

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
	public intersection(other: Rect2): Rect2|null {
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
		const otherRect = new Rect2(
			point.x - margin, point.y - margin,
			margin * 2, margin * 2
		);
		return this.union(otherRect);
	}

	// Returns this grown by [margin] in both the x and y directions.
	public grownBy(margin: number): Rect2 {
		if (margin === 0) {
			return this;
		}

		return new Rect2(
			this.x - margin, this.y - margin, this.w + margin * 2, this.h + margin * 2
		);
	}

	public getClosestPointOnBoundaryTo(target: Point2) {
		const closestEdgePoints = this.getEdges().map(edge => {
			return edge.closestPointTo(target);
		});

		let closest: Point2|null = null;
		let closestDist: number|null = null;
		for (const point of closestEdgePoints) {
			const dist = point.minus(target).length();
			if (closestDist === null || dist < closestDist) {
				closest = point;
				closestDist = dist;
			}
		}
		return closest!;
	}

	public get corners(): Point2[] {
		return [
			this.bottomRight,
			this.topRight,
			this.topLeft,
			this.bottomLeft,
		];
	}

	public get maxDimension() {
		return Math.max(this.w, this.h);
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

	// [affineTransform] is a transformation matrix that both scales and **translates**.
	// the bounding box of this' four corners after transformed by the given affine transformation.
	public transformedBoundingBox(affineTransform: Mat33): Rect2 {
		return Rect2.bboxOf(this.corners.map(corner => affineTransform.transformVec2(corner)));
	}

	/** @return true iff this is equal to [other] ± fuzz */
	public eq(other: Rect2, fuzz: number = 0): boolean {
		return this.topLeft.eq(other.topLeft, fuzz) && this.size.eq(other.size, fuzz);
	}

	public toString(): string {
		return `Rect(point(${this.x}, ${this.y}), size(${this.w}, ${this.h}))`;
	}


	public static fromCorners(corner1: Point2, corner2: Point2) {
		return new Rect2(
			Math.min(corner1.x, corner2.x),
			Math.min(corner1.y, corner2.y),
			Math.abs(corner1.x - corner2.x),
			Math.abs(corner1.y - corner2.y)
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
			Vec2.of(maxX + margin, maxY + margin)
		);
	}

	// @returns a rectangle that contains all of the given rectangles, the bounding box
	//     of the given rectangles.
	public static union(...rects: Rect2[]): Rect2 {
		if (rects.length === 0) {
			return Rect2.empty;
		}

		const firstRect = rects[0];
		let minX: number = firstRect.topLeft.x;
		let minY: number = firstRect.topLeft.y;
		let maxX: number = firstRect.bottomRight.x;
		let maxY: number = firstRect.bottomRight.y;

		for (let i = 1; i < rects.length; i++) {
			const rect = rects[i];
			minX = Math.min(minX, rect.topLeft.x);
			minY = Math.min(minY, rect.topLeft.y);
			maxX = Math.max(maxX, rect.bottomRight.x);
			maxY = Math.max(maxY, rect.bottomRight.y);
		}

		return new Rect2(
			minX, minY, maxX - minX, maxY - minY,
		);
	}

	public static of(template: RectTemplate) {
		const width = template.width ?? template.w ?? 0;
		const height = template.height ?? template.h ?? 0;
		return new Rect2(template.x, template.y, width, height);
	}

	public static empty = new Rect2(0, 0, 0, 0);
	public static unitSquare = new Rect2(0, 0, 1, 1);
}
