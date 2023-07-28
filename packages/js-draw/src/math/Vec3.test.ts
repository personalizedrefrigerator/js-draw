
import Vec3 from './Vec3';

describe('Vec3', () => {
	it('.xy should contain the x and y components', () => {
		const vec = Vec3.of(1, 2, 3);
		expect(vec.xy).toMatchObject({
			x: 1,
			y: 2,
		});
	});

	it('should be combinable with other vectors via .zip', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.zip(vec2, Math.min)).objEq(Vec3.zero);
		expect(vec1.zip(vec2, Math.max)).objEq(Vec3.of(1, 1, 0));
	});

	it('.cross should obey the right hand rule', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.cross(vec2)).objEq(Vec3.unitZ);
		expect(vec2.cross(vec1)).objEq(Vec3.unitZ.times(-1));
	});

	it('.orthog should return an orthogonal vector', () => {
		expect(Vec3.unitZ.orthog().dot(Vec3.unitZ)).toBe(0);

		// Should return some orthogonal vector, even if given the zero vector
		expect(Vec3.zero.orthog().dot(Vec3.zero)).toBe(0);
	});

	it('.minus should return the difference between two vectors', () => {
		expect(Vec3.of(1, 2, 3).minus(Vec3.of(4, 5, 6))).objEq(Vec3.of(1 - 4, 2 - 5, 3 - 6));
	});

	it('.orthog should return a unit vector', () => {
		expect(Vec3.zero.orthog().magnitude()).toBe(1);
		expect(Vec3.unitZ.orthog().magnitude()).toBe(1);
		expect(Vec3.unitX.orthog().magnitude()).toBe(1);
		expect(Vec3.unitY.orthog().magnitude()).toBe(1);
	});

	it('.normalizedOrZero should normalize the given vector or return zero', () => {
		expect(Vec3.zero.normalizedOrZero()).objEq(Vec3.zero);
		expect(Vec3.unitX.normalizedOrZero()).objEq(Vec3.unitX);
		expect(Vec3.unitX.times(22).normalizedOrZero()).objEq(Vec3.unitX);
		expect(Vec3.of(1, 1, 1).times(22).normalizedOrZero().length()).toBeCloseTo(1);
	});
});