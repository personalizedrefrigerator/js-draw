import Rect2 from './Rect2';
import { Vec2 } from '../Vec2';
import Mat33 from '../Mat33';

describe('Rect2', () => {
	it('width, height should always be positive', () => {
		expect(new Rect2(-1, -2, -3, 4)).objEq(new Rect2(-4, -2, 3, 4));
		expect(new Rect2(0, 0, 0, 0).size).objEq(Vec2.zero);
		expect(Rect2.fromCorners(Vec2.of(-3, -3), Vec2.of(-1, -1))).objEq(new Rect2(-3, -3, 2, 2));
	});

	it('bounding boxes should be correctly computed', () => {
		expect(Rect2.bboxOf([Vec2.zero])).objEq(Rect2.empty);

		expect(Rect2.bboxOf([Vec2.of(-1, -1), Vec2.of(1, 2), Vec2.of(3, 4), Vec2.of(1, -4)])).objEq(
			new Rect2(-1, -4, 4, 8),
		);

		expect(Rect2.bboxOf([Vec2.zero], 10)).objEq(new Rect2(-10, -10, 20, 20));
	});

	it('"union"s should contain both composite rectangles.', () => {
		expect(new Rect2(0, 0, 1, 1).union(new Rect2(1, 1, 2, 2))).objEq(new Rect2(0, 0, 3, 3));
		expect(Rect2.empty.union(Rect2.empty)).objEq(Rect2.empty);
	});

	it('should handle empty unions', () => {
		expect(Rect2.union()).toStrictEqual(Rect2.empty);
	});

	it('should correctly union multiple rectangles', () => {
		expect(Rect2.union(new Rect2(0, 0, 1, 1), new Rect2(1, 1, 2, 2))).objEq(new Rect2(0, 0, 3, 3));

		expect(
			Rect2.union(new Rect2(-1, 0, 1, 1), new Rect2(1, 1, 2, 2), new Rect2(1, 10, 1, 0.1)),
		).objEq(new Rect2(-1, 0, 4, 10.1));

		expect(
			Rect2.union(new Rect2(-1, 0, 1, 1), new Rect2(1, -11.1, 2, 2), new Rect2(1, 10, 1, 0.1)),
		).objEq(new Rect2(-1, -11.1, 4, 21.2));
	});

	it('should contain points that are within a rectangle', () => {
		expect(new Rect2(-1, -1, 2, 2).containsPoint(Vec2.zero)).toBe(true);
		expect(new Rect2(-1, -1, 0, 0).containsPoint(Vec2.zero)).toBe(false);
		expect(new Rect2(1, 2, 3, 4).containsRect(Rect2.empty)).toBe(false);
		expect(new Rect2(1, 2, 3, 4).containsRect(new Rect2(1, 2, 1, 2))).toBe(true);
		expect(new Rect2(-2, -2, 4, 4).containsRect(new Rect2(-1, 0, 1, 1))).toBe(true);
		expect(new Rect2(-2, -2, 4, 4).containsRect(new Rect2(-1, 0, 10, 1))).toBe(false);
	});

	it('.center should be the center of a rectangle', () => {
		expect(new Rect2(-1, -1, 2, 3).center).objEq(Vec2.of(0, 0.5));
		expect(new Rect2(-1, -1, 2, 2).center).objEq(Vec2.zero);
	});

	describe('containsRect', () => {
		it('a rectangle should contain itself', () => {
			const rect = new Rect2(1 / 3, 1 / 4, 1 / 5, 1 / 6);
			expect(rect.containsRect(rect)).toBe(true);
		});

		it('empty rect should not contain a larger rect', () => {
			expect(Rect2.empty.containsRect(new Rect2(-1, -1, 3, 3))).toBe(false);
		});

		it('should correctly contain rectangles', () => {
			const testRect = new Rect2(4, -10, 50, 100);
			expect(testRect.containsRect(new Rect2(4.1, 0, 1, 1))).toBe(true);
			expect(testRect.containsRect(new Rect2(48, 0, 1, 1))).toBe(true);
			expect(testRect.containsRect(new Rect2(48, -9, 1, 1))).toBe(true);
			expect(testRect.containsRect(new Rect2(48, -9, 1, 91))).toBe(true);
		});
	});

	it('intersecting rectangles should be identified as intersecting', () => {
		expect(new Rect2(-1, -1, 2, 2).intersects(Rect2.empty)).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(0, 0, 1, 1))).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(0, 0, 10, 10))).toBe(true);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(3, 3, 10, 10))).toBe(false);
		expect(new Rect2(-1, -1, 2, 2).intersects(new Rect2(0.2, 0.1, 0, 0))).toBe(true);
		expect(new Rect2(-100, -1, 200, 2).intersects(new Rect2(-5, -5, 10, 30))).toBe(true);
		expect(new Rect2(-100, -1, 200, 2).intersects(new Rect2(-5, 50, 10, 30))).toBe(false);
	});

	it('should correctly compute the intersection of one rectangle and several others', () => {
		const mainRect = new Rect2(334, 156, 333, 179);
		const shouldIntersect = [
			new Rect2(400.8, 134.8, 8.4, 161.4),
			new Rect2(324.8, 93, 164.4, 75.2),
			new Rect2(435.8, 146.8, 213.2, 192.6),
			new Rect2(550.8, 211.8, 3.4, 3.4),
			new Rect2(478.8, 93.8, 212.4, 95.4),
		];
		const shouldNotIntersect = [new Rect2(200, 200, 1, 1)];

		for (const rect of shouldIntersect) {
			expect(mainRect.intersects(rect)).toBe(true);
		}
		for (const rect of shouldNotIntersect) {
			expect(mainRect.intersects(rect)).toBe(false);
		}
	});

	it('intersecting rectangles should have their intersections correctly computed', () => {
		expect(new Rect2(-1, -1, 2, 2).intersection(Rect2.empty)).objEq(Rect2.empty);
		expect(new Rect2(-1, -1, 2, 2).intersection(new Rect2(0, 0, 3, 3))).objEq(
			new Rect2(0, 0, 1, 1),
		);
		expect(new Rect2(-2, 0, 1, 2).intersection(new Rect2(-3, 0, 2, 2))).objEq(
			new Rect2(-2, 0, 1, 2),
		);
		expect(new Rect2(-1, -1, 2, 2).intersection(new Rect2(3, 3, 10, 10))).toBe(null);
	});

	it('A transformed bounding box', () => {
		expect(Rect2.unitSquare.transformedBoundingBox(Mat33.scaling2D(2))).objEq(
			new Rect2(0, 0, 2, 2),
		);

		const rotationMat = Mat33.zRotation(Math.PI / 4);
		const rect = Rect2.unitSquare.translatedBy(Vec2.of(-0.5, -0.5));
		const transformedBBox = rect.transformedBoundingBox(rotationMat);
		expect(transformedBBox.containsPoint(Vec2.of(0.5, 0.5)));
		expect(transformedBBox.containsRect(rect)).toBe(true);
	});

	it('.grownBy should expand a rectangle by the given margin', () => {
		expect(Rect2.empty.grownBy(0)).toBe(Rect2.empty);

		// Should add padding to all sides.
		expect(new Rect2(1, 2, 3, 4).grownBy(1)).objEq(new Rect2(0, 1, 5, 6));

		// Shrinking should not result in negative widths/heights and
		// should adjust x/y appropriately
		expect(new Rect2(1, 2, 1, 2).grownBy(-1)).objEq(new Rect2(1.5, 3, 0, 0));
		expect(new Rect2(1, 2, 4, 4).grownBy(-1)).objEq(new Rect2(2, 3, 2, 2));
		expect(new Rect2(1, 2, 2, 8).grownBy(-2)).objEq(new Rect2(2, 4, 0, 4));
	});

	it('.grownToSize should grow the rectangle to the given minimum size', () => {
		expect(Rect2.empty.grownToSize(Vec2.of(10, 10))).objEq(new Rect2(-5, -5, 10, 10));
		expect(Rect2.empty.grownToSize(Vec2.of(10, 4))).objEq(new Rect2(-5, -2, 10, 4));

		expect(Rect2.unitSquare.grownToSize(Vec2.of(0.5, 0.5))).toBe(Rect2.unitSquare);
		expect(new Rect2(0, 0, 2, 2).grownToSize(Vec2.of(4, 0.5))).objEq(new Rect2(-1, 0, 4, 2));
	});

	describe('should correctly expand to include a given point', () => {
		it('Growing an empty rectange to include (1, 0)', () => {
			const originalRect = Rect2.empty;
			const grownRect = originalRect.grownToPoint(Vec2.unitX);
			expect(grownRect).objEq(new Rect2(0, 0, 1, 0));
		});

		it('Growing the unit rectangle to include (-5, 1), with a margin', () => {
			const originalRect = Rect2.unitSquare;
			const grownRect = originalRect.grownToPoint(Vec2.of(-5, 1), 4);
			expect(grownRect).objEq(new Rect2(-9, -3, 10, 8));
		});

		it('Growing to include a point just above', () => {
			const original = Rect2.unitSquare;
			const grown = original.grownToPoint(Vec2.of(-1, -1));
			expect(grown).objEq(new Rect2(-1, -1, 2, 2));
		});

		it('Growing to include a point just below', () => {
			const original = Rect2.unitSquare;
			const grown = original.grownToPoint(Vec2.of(2, 2));
			expect(grown).objEq(new Rect2(0, 0, 2, 2));
		});
	});

	describe('divideIntoGrid', () => {
		it('division of unit square', () => {
			expect(Rect2.unitSquare.divideIntoGrid(2, 2)).toMatchObject([
				new Rect2(0, 0, 0.5, 0.5),
				new Rect2(0.5, 0, 0.5, 0.5),
				new Rect2(0, 0.5, 0.5, 0.5),
				new Rect2(0.5, 0.5, 0.5, 0.5),
			]);
			expect(Rect2.unitSquare.divideIntoGrid(0, 0).length).toBe(0);
			expect(Rect2.unitSquare.divideIntoGrid(100, 0).length).toBe(0);
			expect(Rect2.unitSquare.divideIntoGrid(4, 1)).toMatchObject([
				new Rect2(0, 0, 0.25, 1),
				new Rect2(0.25, 0, 0.25, 1),
				new Rect2(0.5, 0, 0.25, 1),
				new Rect2(0.75, 0, 0.25, 1),
			]);
		});
		it('division of translated square', () => {
			expect(new Rect2(3, -3, 4, 4).divideIntoGrid(2, 1)).toMatchObject([
				new Rect2(3, -3, 2, 4),
				new Rect2(5, -3, 2, 4),
			]);
		});
		it('division of empty square', () => {
			expect(Rect2.empty.divideIntoGrid(1000, 10000).length).toBe(1);
		});

		it('division of rectangle', () => {
			expect(new Rect2(0, 0, 2, 1).divideIntoGrid(2, 2)).toMatchObject([
				new Rect2(0, 0, 1, 0.5),
				new Rect2(1, 0, 1, 0.5),
				new Rect2(0, 0.5, 1, 0.5),
				new Rect2(1, 0.5, 1, 0.5),
			]);
		});
	});

	describe('should correctly return the closest point on the edge of a rectangle', () => {
		it('with the unit square', () => {
			const rect = Rect2.unitSquare;
			expect(rect.getClosestPointOnBoundaryTo(Vec2.zero)).objEq(Vec2.zero);
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(-1, -1))).objEq(Vec2.zero);
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(-1, 0.5))).objEq(Vec2.of(0, 0.5));
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(1, 0.5))).objEq(Vec2.of(1, 0.5));
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(0.6, 0.6))).objEq(Vec2.of(1, 0.6));
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(2, 0.5))).objEq(Vec2.of(1, 0.5));
			expect(rect.getClosestPointOnBoundaryTo(Vec2.of(0.6, 0.6))).objEq(Vec2.of(1, 0.6));
		});
	});
});
