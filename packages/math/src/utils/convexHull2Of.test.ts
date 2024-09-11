import { Vec2 } from '../Vec2';
import { Rect2 } from '../shapes/Rect2';
import convexHull2Of from './convexHull2Of';

describe('convexHull2Of', () => {
	it.each([
		[[Vec2.of(1, 1)], [Vec2.of(1, 1)]],

		// Line
		[
			[Vec2.of(1, 1), Vec2.of(2, 2)],
			[Vec2.of(1, 1), Vec2.of(2, 2)],
		],

		// Just a triangle
		[
			[Vec2.of(1, 1), Vec2.of(4, 2), Vec2.of(3, 3)],
			[Vec2.of(1, 1), Vec2.of(4, 2), Vec2.of(3, 3)],
		],

		// Triangle with an extra point
		[
			[Vec2.of(1, 1), Vec2.of(2, 20), Vec2.of(3, 5), Vec2.of(4, 3)],
			[Vec2.of(1, 1), Vec2.of(4, 3), Vec2.of(2, 20)],
		],

		// Points within a triangle
		[
			[
				Vec2.of(28, 5),
				Vec2.of(4, 5),
				Vec2.of(-100, -100),
				Vec2.of(7, 120),
				Vec2.of(1, 8),
				Vec2.of(100, -100),
				Vec2.of(2, 4),
				Vec2.of(3, 4),
				Vec2.of(4, 5),
			],
			[Vec2.of(-100, -100), Vec2.of(100, -100), Vec2.of(7, 120)],
		],

		// Points within a triangle (repeated vertex)
		[
			[
				Vec2.of(28, 5),
				Vec2.of(4, 5),
				Vec2.of(-100, -100),
				Vec2.of(-100, -100),
				Vec2.of(7, 120),
				Vec2.of(1, 8),
				Vec2.of(100, -100),
				Vec2.of(2, 4),
				Vec2.of(3, 4),
				Vec2.of(4, 5),
			],
			[Vec2.of(-100, -100), Vec2.of(100, -100), Vec2.of(7, 120)],
		],

		// Points within a square
		[
			[
				Vec2.of(28, 5),
				Vec2.of(4, 5),
				Vec2.of(-100, -100),
				Vec2.of(100, 100),
				Vec2.of(7, 100),
				Vec2.of(1, 8),
				Vec2.of(-100, 100),
				Vec2.of(100, -100),
				Vec2.of(2, 4),
				Vec2.of(3, 4),
				Vec2.of(4, 5),
			],
			[Vec2.of(-100, -100), Vec2.of(100, -100), Vec2.of(100, 100), Vec2.of(-100, 100)],
		],

		[Rect2.unitSquare.corners, [Vec2.of(1, 0), Vec2.of(1, 1), Vec2.of(0, 1), Vec2.of(0, 0)]],
	])('should compute the convex hull of a set of points (%j)', (points, expected) => {
		expect(convexHull2Of(points)).toMatchObject(expected);
	});
});
