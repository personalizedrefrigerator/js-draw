import { Vec2 } from '../Vec2';
import Triangle from './Triangle';

describe('Triangle', () => {
	describe('signed distance function should return correct values', () => {
		it('signed distance function should be zero along the boundary of a shape', () => {
			const testTriangle = Triangle.fromVertices(Vec2.of(-1, -1), Vec2.of(0, 1), Vec2.of(1, -1));

			// SDF for each vertex should be zero.
			for (const vertex of testTriangle.vertices) {
				expect(testTriangle.signedDistance(vertex)).toBeCloseTo(0);
			}

			// SDF along each side should be zero
			for (const side of testTriangle.getEdges()) {
				for (let t = 0.1; t < 1; t += 0.1) {
					expect(testTriangle.signedDistance(side.at(t))).toBeCloseTo(0);
				}
			}
		});

		it(
			'signed distance function should be the negative distance to the edge ' +
				'of the triangle on the interior of a shape, same as distance outside of shape',
			() => {
				const testTriangle = Triangle.fromVertices(Vec2.of(-1, -1), Vec2.of(0, 1), Vec2.of(1, -1));

				// A point vertically above the triangle: Outside, so positive SDF
				expect(testTriangle.signedDistance(Vec2.of(0, 2))).toBeCloseTo(1);

				// Similarly, a point vertically below the triangle is outside, so should have positive SDF
				expect(testTriangle.signedDistance(Vec2.of(0, -2))).toBeCloseTo(1);

				// A point just above the left side (and outside the triangle) should also have positive SDF
				expect(testTriangle.signedDistance(Vec2.of(-0.8, 0.8))).toBeGreaterThan(0);

				const firstSide = testTriangle.getEdges()[0];
				const firstSideMidpoint = firstSide.at(0.5);
				const firstSideNormal = firstSide.direction.orthog();

				// Move a point towards the first side
				for (let t = 0.5; t > -0.5; t -= 0.1) {
					const point = firstSideMidpoint.minus(firstSideNormal.times(t));
					const distFromSide1 = firstSide.distance(point);
					const signedDist = testTriangle.signedDistance(point);

					// Inside the shape
					if (t > 0) {
						// Inside the shape
						expect(testTriangle.containsPoint(point)).toBe(true);

						expect(signedDist).toBeCloseTo(-distFromSide1);
					} else {
						// Outside the shape
						expect(testTriangle.containsPoint(point)).toBe(false);

						expect(signedDist).toBeCloseTo(distFromSide1);
					}
				}
			},
		);
	});
});
