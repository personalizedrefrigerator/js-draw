import { Vec2 } from '../Vec2';
import QuadraticBezier from './QuadraticBezier';

describe('QuadraticBezier', () => {
	test.each([
		new QuadraticBezier(Vec2.zero, Vec2.of(10, 0), Vec2.of(20, 0)),
		new QuadraticBezier(Vec2.of(-10, 0), Vec2.of(2, 10), Vec2.of(20, 0)),
		new QuadraticBezier(Vec2.of(0, 0), Vec2.of(4, -10), Vec2.of(20, 60)),
		new QuadraticBezier(Vec2.of(0, 0), Vec2.of(4, -10), Vec2.of(-20, 60)),
	])('approxmiateDistance should approximately return the distance to the curve (%s)', (curve) => {
		const testPoints = [
			Vec2.of(1, 1),
			Vec2.of(-1, 1),
			Vec2.of(100, 0),
			Vec2.of(20, 3),
			Vec2.of(4, -30),
			Vec2.of(5, 0),
		];

		for (const point of testPoints) {
			const actualDist = curve.distance(point);
			const approxDist = curve.approximateDistance(point);

			expect(approxDist).toBeGreaterThan(actualDist * 0.6 - 0.25);
			expect(approxDist).toBeLessThan(actualDist * 1.5 + 2.6);
		}
	});

	test.each([
		[new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY), Vec2.zero, 0],
		[new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY), Vec2.unitY, 1],

		[new QuadraticBezier(Vec2.zero, Vec2.of(0.5, 0), Vec2.of(1, 0)), Vec2.of(0.4, 0), 0.4],
		[new QuadraticBezier(Vec2.zero, Vec2.of(0, 0.5), Vec2.of(0, 1)), Vec2.of(0, 0.4), 0.4],
		[new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY), Vec2.unitX, 0.42514],

		// Should not return an out-of-range parameter
		[new QuadraticBezier(Vec2.zero, Vec2.of(0, 0.5), Vec2.unitY), Vec2.of(0, -1000), 0],
		[new QuadraticBezier(Vec2.zero, Vec2.of(0, 0.5), Vec2.unitY), Vec2.of(0, 1000), 1],

		// Edge case -- just a point
		[new QuadraticBezier(Vec2.zero, Vec2.zero, Vec2.zero), Vec2.of(0, 1000), 0],
	])(
		'nearestPointTo should return the nearest point and parameter value on %s to %s',
		(bezier, point, expectedParameter) => {
			const nearest = bezier.nearestPointTo(point);
			expect(nearest.parameterValue).toBeCloseTo(expectedParameter, 0.0001);
			expect(nearest.point).objEq(bezier.at(nearest.parameterValue));
		},
	);

	test('.normalAt should return a unit normal vector at the given parameter value', () => {
		const curves = [
			new QuadraticBezier(Vec2.zero, Vec2.unitY, Vec2.unitY.times(2)),
			new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY),
			new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY.times(-2)),
			new QuadraticBezier(Vec2.of(2, 3), Vec2.of(4, 5.1), Vec2.of(6, 7)),
			new QuadraticBezier(Vec2.of(2, 3), Vec2.of(100, 1000), Vec2.unitY.times(-2)),
		];

		for (const curve of curves) {
			for (let t = 0; t < 1; t += 0.1) {
				const normal = curve.normalAt(t);
				expect(normal.length()).toBe(1);

				const tangentApprox = curve.at(t + 0.001).minus(curve.at(t - 0.001));

				// The tangent vector should be perpindicular to the normal
				expect(tangentApprox.dot(normal)).toBeCloseTo(0);
			}
		}
	});

	test.each([
		new QuadraticBezier(Vec2.zero, Vec2.unitY, Vec2.unitY.times(2)),
		new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY),
		new QuadraticBezier(Vec2.zero, Vec2.unitY, Vec2.unitX),
	])(
		'.derivativeAt should return a derivative vector with the correct direction (curve: %s)',
		(curve) => {
			for (let t = 0; t < 1; t += 0.1) {
				const derivative = curve.derivativeAt(t);
				const derivativeApprox = curve.at(t + 0.001).minus(curve.at(t - 0.001));
				expect(derivativeApprox.normalized()).objEq(derivative.normalized(), 0.01);
			}
		},
	);

	test('should support Bezier-Bezier intersections', () => {
		const b1 = new QuadraticBezier(Vec2.zero, Vec2.unitX, Vec2.unitY);
		const b2 = new QuadraticBezier(Vec2.of(-1, 0.5), Vec2.of(0, 0.6), Vec2.of(1, 0.4));
		expect(b1.intersectsBezier(b2)).toHaveLength(1);
	});
});
