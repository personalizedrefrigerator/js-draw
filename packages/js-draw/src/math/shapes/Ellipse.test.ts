import Mat33 from '../Mat33';
import { Point2, Vec2 } from '../Vec2';
import Ellipse from './Ellipse';
import LineSegment2 from './LineSegment2';

describe('Ellipse', () => {
	type ProcessEllipseCallback = (
		ellipse: Ellipse,

		// Foci
		f1: Point2, f2: Point2,

		// Angle of the ellipse
		angle: number,

		// t is a parameter that can be used to initialize other variables.
		t: number
	)=>void;
	const forEachEllipseOnMainTestPath = (handleEllipse: ProcessEllipseCallback) => {
		for (let t = 0; t < 1; t += 0.1) {
			// Select parameters based on t
			const x1 = Math.cos(t * 2 * Math.PI) * 10;
			const y1 = Math.sin(t * 3 * Math.PI) * 3;
			const dist = (Math.cos(t * 12 * Math.PI) + 1) * 4;
			const angle = t * 2 * Math.PI;
			const semimajorAxisLen = 16 + t;

			// Compute the foci locations from the parameters.
			const x2 = x1 + dist * Math.cos(angle);
			const y2 = y1 + dist * Math.sin(angle);

			const f1 = Vec2.of(x1, y1);
			const f2 = Vec2.of(x2, y2);

			const ellipse = new Ellipse(f1, f2, semimajorAxisLen);
			handleEllipse(ellipse, f1, f2, angle, t);
		}
	};

	describe('should compute correct center, angle, and transform', () => {
		it('for the unit circle', () => {
			const center = Vec2.zero;
			const radius = 1;
			const circle = new Ellipse(center, center, radius);
			expect(circle.rx).toBeCloseTo(radius);
			expect(circle.ry).toBeCloseTo(radius);
			expect(circle.transform).objEq(Mat33.identity);
			expect(circle.center).objEq(center);
			expect(circle.angle).toBeCloseTo(0);
		});

		it('for a circle', () => {
			for (let x = -1; x < 1; x += 0.3) {
				for (let y = -1; y < 1; y += 0.3) {
					const center = Vec2.of(x, y);
					const ellipse = new Ellipse(center, center, 1);
					expect(ellipse.center).objEq(center);
					expect(ellipse.angle).toBeCloseTo(0);
					expect(ellipse.ry).toBeCloseTo(1);

					// Should also map the unit x and unit y vectors to translated unit x and
					// unit y vectors (points on the unit circle -> points on the translated unit
					// circle).
					expect(
						ellipse.transform.transformVec2(Vec2.unitX)
					).objEq(ellipse.center.plus(Vec2.unitX));
					expect(
						ellipse.transform.transformVec2(Vec2.unitY)
					).objEq(ellipse.center.plus(Vec2.unitY));
				}
			}
		});

		it('for an ellipse on the x axis', () => {
			for (let x1 = -1; x1 < 2; x1 += 0.3) {
				for (let x2 = -2; x2 < 1; x2 += 0.3) {
					const f1 = Vec2.of(x1, 0);
					const f2 = Vec2.of(x2, 0);

					const ellipse = new Ellipse(f1, f2, 12);
					expect(ellipse.center).objEq(Vec2.of((f1.x + f2.x) / 2, 0));

					// Should produce an angle that results in a line with 0 slope
					expect(Math.tan(ellipse.angle)).toBeCloseTo(0);

					expect(
						ellipse.hasPointOnBoundary(ellipse.transform.transformVec2(Vec2.unitX))
					).toBe(true);
					expect(
						ellipse.hasPointOnBoundary(ellipse.transform.transformVec2(Vec2.unitY))
					).toBe(true);
				}
			}
		});

		it('for a rotated ellipse', () => {
			forEachEllipseOnMainTestPath((ellipse, f1, f2, angle, t) => {
				expect(ellipse.center).objEq(f1.plus(f2).times(0.5));

				// Angle should produce the same line as ellipse.angle
				expect(Math.abs(Math.cos(ellipse.angle))).toBeCloseTo(Math.abs(Math.cos(angle)));
				expect(Math.abs(Math.sin(ellipse.angle))).toBeCloseTo(Math.abs(Math.sin(angle)));

				// Should also transform a point from the unit circle to this ellipse
				const circlePoint = Vec2.of(Math.cos(t * 2 * Math.PI), Math.sin(t * 2 * Math.PI));
				const ellipsePoint = ellipse.transform.transformVec2(circlePoint);
				expect(ellipse.hasPointOnBoundary(ellipsePoint)).toBe(true);
			});
		});
	});

	it('parameterForPoint should return the parameter value for a given point', () => {
		forEachEllipseOnMainTestPath((ellipse) => {
			for (let i = -Math.PI + 0.001; i < Math.PI; i += 0.3) {
				expect(ellipse.parameterForPoint(ellipse.at(i))).toBeCloseTo(i);
			}
		});
	});

	describe('should compute correct signed distance', () => {
		it('for a circle', () => {
			for (const center of [ Vec2.zero, Vec2.of(1, 0.5)]) {
				const radius = 1;
				const circle = new Ellipse(center, center, radius);

				expect(
					circle.signedDistance(Vec2.of(2, 0).plus(center))
				).toBeCloseTo(2 - radius);
				expect(
					circle.signedDistance(Vec2.of(-1, -1).plus(center))
				).toBeCloseTo(Math.hypot(1 - 1/Math.SQRT2, 1 - 1/Math.SQRT2));
				expect(circle.signedDistance(center)).toBeCloseTo(-radius);
			}
		});

		it('for a rotated ellipse', () => {
			forEachEllipseOnMainTestPath((ellipse, _f1, _f2, _angle, t) => {
				// Should return a negative signed distance for points within
				// the ellipse
				const delta = Vec2.of(
					ellipse.rx * Math.cos(t) * 0.9, ellipse.ry * Math.sin(t) * 0.9
				);
				expect(ellipse.signedDistance(ellipse.center.plus(delta))).toBeLessThan(0);
				expect(ellipse.signedDistance(ellipse.center)).toBeLessThan(0);

				// Should return a positive signed distance for points outside of the ellipse.
				expect(
					ellipse.signedDistance(ellipse.center.plus(delta.times(2)))
				).toBeGreaterThan(0);

				// Should return zero for points on the ellipse,
				// length of normal for points translated by normal.
				for (let t2 = 0; t2 < 2 * Math.PI; t2 += 0.3) {
					expect(ellipse.hasPointOnBoundary(ellipse.at(t2))).toBe(true);
					expect(
						ellipse.signedDistance(ellipse.at(t2))
					).toBeCloseTo(0);

					// Shifting along the normal should produce the distance
					// gone along the normal.
					let normalDist = Math.tan(t2 + 0.1);

					if (Math.abs(normalDist) > Math.min(ellipse.rx, ellipse.ry)) {
						normalDist = Math.min(ellipse.rx, ellipse.ry) * Math.sin(t2 + 0.1);
					}

					const normal = ellipse.derivativeAt(t2).orthog().normalized();
					const p2 = ellipse.at(t2).plus(normal.times(-normalDist));

					expect(
						ellipse.signedDistance(p2)
					).toBeCloseTo(normalDist);
				}
			});
		});
	});

	describe('should compute line segment intersection correctly', () => {
		it('for a circle', () => {
			const center = Vec2.zero;
			const radius = 1;
			const circle = new Ellipse(center, center, radius);

			const seg1 = new LineSegment2(Vec2.of(-10, 0), Vec2.of(10, 0));
			const intersections1 = circle.intersectsLineSegment(seg1);
			expect(intersections1).toHaveLength(2);
			expect(intersections1[0]).objEq(Vec2.of(1, 0));
			expect(intersections1[1]).objEq(Vec2.of(-1, 0));

			const seg2 = new LineSegment2(Vec2.of(0, -10), Vec2.of(0, 10));
			const intersections2 = circle.intersectsLineSegment(seg2);
			expect(intersections2).toHaveLength(2);
			expect(intersections2[0]).objEq(Vec2.of(0, 1));
			expect(intersections2[1]).objEq(Vec2.of(0, -1));
		});
	});

	describe('should compute correct tight bounding box', () => {
		it('for a circle', () => {
			for (const center of [ Vec2.zero, Vec2.of(1, 0.5)]) {
				const radius = 1;
				const circle = new Ellipse(center, center, radius);

				const bbox = circle.getTightBoundingBox();
				expect(bbox.size).objEq(Vec2.of(radius * 2, radius * 2));
				expect(bbox.center).objEq(center);
			}
		});

		it('for a stretched circle', () => {
			const rx = 2;
			const stretchedCircle = new Ellipse(Vec2.of(-1, 0), Vec2.of(1, 0), rx);

			const bbox = stretchedCircle.getTightBoundingBox();
			expect(bbox.center).objEq(Vec2.zero);
			expect(bbox.width).toBe(4); // 2rx
			expect(bbox.height).toBe(2 * Math.sqrt(rx ** 2 - 1 ** 2)); // 2ry
		});
	});

	it('should compute correct XY extrema', () => {
		forEachEllipseOnMainTestPath(ellipse => {
			const extrema = ellipse.getXYExtrema();
			expect(extrema).toHaveLength(4);

			// Should be in correct order (small x, big x, small y, big y).
			expect(extrema[0].x).toBeLessThanOrEqual(extrema[1].x);
			expect(extrema[2].y).toBeLessThanOrEqual(extrema[3].y);

			// Neighboring points should not be as extreme
			for (let delta = -0.1; delta <= 0.1; delta += 0.04) {
				for (let i = 0; i < 4; i++) {
					const extremaParam = ellipse.parameterForPoint(extrema[i])!;
					const neighborPoint = ellipse.at(extremaParam + delta);

					expect(neighborPoint.x).toBeGreaterThan(extrema[0].x);
					expect(neighborPoint.x).toBeLessThan(extrema[1].x);
					expect(neighborPoint.y).toBeGreaterThan(extrema[2].y);
					expect(neighborPoint.y).toBeLessThan(extrema[3].y);
				}
			}
		});
	});
});
