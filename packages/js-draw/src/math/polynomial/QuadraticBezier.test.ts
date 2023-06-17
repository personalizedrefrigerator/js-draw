import { Vec2 } from '../Vec2';
import QuadraticBezier from './QuadraticBezier';

describe('QuadraticBezier', () => {
	it('approxmiateDistance should approximately return the distance to the curve', () => {
		const curves = [
			new QuadraticBezier(Vec2.zero, Vec2.of(10, 0), Vec2.of(20, 0)),
			new QuadraticBezier(Vec2.of(-10, 0), Vec2.of(2, 10), Vec2.of(20, 0)),
			new QuadraticBezier(Vec2.of(0, 0), Vec2.of(4, -10), Vec2.of(20, 60)),
			new QuadraticBezier(Vec2.of(0, 0), Vec2.of(4, -10), Vec2.of(-20, 60)),
		];
		const testPoints = [
			Vec2.of(1, 1),
			Vec2.of(-1, 1),
			Vec2.of(100, 0),
			Vec2.of(20, 3),
			Vec2.of(4, -30),
			Vec2.of(5, 0),
		];

		for (const curve of curves) {
			for (const point of testPoints) {
				const actualDist = curve.distance(point);
				const approxDist = curve.approximateDistance(point);

				expect(approxDist).toBeGreaterThan(actualDist * 0.6 - 0.25);
				expect(approxDist).toBeLessThan(actualDist * 1.5 + 2.6);
			}
		}
	});
});