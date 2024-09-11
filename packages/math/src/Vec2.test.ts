import { Vec2 } from './Vec2';
import Vec3 from './Vec3';

describe('Vec2', () => {
	it('Magnitude', () => {
		expect(Vec2.of(3, 4).magnitude()).toBe(5);
	});

	it('Addition', () => {
		expect(Vec2.of(1, 2).plus(Vec2.of(3, 4))).objEq(Vec2.of(4, 6));
		expect(Vec2.of(1, 2).plus(Vec3.of(3, 4, 1))).objEq(Vec3.of(4, 6, 1));
	});

	it('Multiplication', () => {
		expect(Vec2.of(1, -1).times(22)).objEq(Vec2.of(22, -22));
		expect(Vec2.of(1, -1).scale(Vec3.of(-1, 2, 3))).objEq(Vec2.of(-1, -2));
	});

	it('More complicated expressions', () => {
		expect(Vec2.of(1, 2).plus(Vec2.of(3, 4)).times(2)).objEq(Vec2.of(8, 12));
	});

	it('Angle', () => {
		expect(Vec2.of(-1, 1).angle()).toBeCloseTo((3 * Math.PI) / 4);
	});

	it('Perpindicular', () => {
		const tolerance = 0.001;
		expect(Vec2.unitX.cross(Vec3.unitZ)).objEq(Vec2.unitY.times(-1), tolerance);
		expect(Vec2.unitX.orthog()).objEq(Vec2.unitY, tolerance);
	});
});
