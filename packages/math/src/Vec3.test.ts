import Vec3 from './Vec3';

describe('Vec3', () => {
	test('.xy should contain the x and y components', () => {
		const vec = Vec3.of(1, 2, 3);
		expect(vec.xy).toMatchObject({
			x: 1,
			y: 2,
		});
	});

	test('should be combinable with other vectors via .zip', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.zip(vec2, Math.min)).objEq(Vec3.zero);
		expect(vec1.zip(vec2, Math.max)).objEq(Vec3.of(1, 1, 0));
	});

	test('.cross should obey the right hand rule', () => {
		const vec1 = Vec3.unitX;
		const vec2 = Vec3.unitY;
		expect(vec1.cross(vec2)).objEq(Vec3.unitZ);
		expect(vec2.cross(vec1)).objEq(Vec3.unitZ.times(-1));
	});

	test('.orthog should return an orthogonal vector', () => {
		expect(Vec3.unitZ.orthog().dot(Vec3.unitZ)).toBe(0);

		// Should return some orthogonal vector, even if given the zero vector
		expect(Vec3.zero.orthog().dot(Vec3.zero)).toBe(0);
	});

	test('.minus should return the difference between two vectors', () => {
		expect(Vec3.of(1, 2, 3).minus(Vec3.of(4, 5, 6))).objEq(Vec3.of(1 - 4, 2 - 5, 3 - 6));
	});

	test('.orthog should return a unit vector', () => {
		expect(Vec3.zero.orthog().magnitude()).toBe(1);
		expect(Vec3.unitZ.orthog().magnitude()).toBe(1);
		expect(Vec3.unitX.orthog().magnitude()).toBe(1);
		expect(Vec3.unitY.orthog().magnitude()).toBe(1);
	});

	test('.normalizedOrZero should normalize the given vector or return zero', () => {
		expect(Vec3.zero.normalizedOrZero()).objEq(Vec3.zero);
		expect(Vec3.unitX.normalizedOrZero()).objEq(Vec3.unitX);
		expect(Vec3.unitX.times(22).normalizedOrZero()).objEq(Vec3.unitX);
		expect(Vec3.of(1, 1, 1).times(22).normalizedOrZero().length()).toBeCloseTo(1);
	});

	test.each([
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(1, 2, 1), expected: 1 },
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(1, 2, 2), expected: 2 },
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(2, 2, 2), expected: 3 },
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(0, 1, 1), expected: 1 },
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(0, 1, 0), expected: 2 },
		{ from: Vec3.of(1, 1, 1), to: Vec3.of(0, 0, 0), expected: 3 },
		{ from: Vec3.of(-1, -10, 0), to: Vec3.of(1, 2, 0), expected: 148 },
		{ from: Vec3.of(-1, -10, 0), to: Vec3.of(1, 2, 0), expected: 148 },
	])(
		'.squareDistanceTo and .distanceTo should return correct square and euclidean distances (%j)',
		({ from, to, expected }) => {
			expect(from.squareDistanceTo(to)).toBe(expected);
			expect(to.squareDistanceTo(from)).toBe(expected);
			expect(to.distanceTo(from)).toBeCloseTo(Math.sqrt(expected));
			expect(to.minus(from).magnitudeSquared()).toBe(expected);
			expect(from.minus(to).magnitudeSquared()).toBe(expected);
		},
	);

	test.each([
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(4, 5, 6), tolerance: 0.1, eq: false },
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(4, 5, 6), tolerance: 10, eq: true },
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(1, 2, 3), tolerance: 0, eq: true },
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(1, 2, 4), tolerance: 0, eq: false },
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(1, 4, 3), tolerance: 0, eq: false },
		{ a: Vec3.of(1, 2, 3), b: Vec3.of(4, 2, 3), tolerance: 0, eq: false },
		{ a: Vec3.of(1, 2, 3.0001), b: Vec3.of(1, 2, 3), tolerance: 1e-12, eq: false },
		{ a: Vec3.of(1, 2, 3.0001), b: Vec3.of(1, 2, 3), tolerance: 1e-3, eq: true },
		{ a: Vec3.of(1, 2.00001, 3.0001), b: Vec3.of(1.00001, 2, 3), tolerance: 1e-3, eq: true },
	])('.eq should support tolerance (case %#)', ({ a, b, tolerance, eq }) => {
		expect(a.eq(b, tolerance)).toBe(eq);
		expect(b.eq(a, tolerance)).toBe(eq);
	});
});
