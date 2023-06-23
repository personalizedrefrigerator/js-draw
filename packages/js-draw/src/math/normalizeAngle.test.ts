import normalizeAngle from './normalizeAngle';

describe('normalizeAngle', () => {
	it('should map angles in the range (pi, 2pi] to angles in the range (-pi, 0]', () => {
		for (let theta = Math.PI + 0.001; theta < Math.PI * 2; theta += 0.1) {
			const thetaPrime = normalizeAngle(theta);
			expect(thetaPrime).toBeCloseTo(theta - 2 * Math.PI);
		}
	});

	it('should produce angles with the same sine and cosine values, in the range (-pi, pi]', () => {
		for (let theta = -2 * Math.PI; theta < 4 * Math.PI; theta += 0.3) {
			const thetaPrime = normalizeAngle(theta);

			expect(thetaPrime).toBeGreaterThan(-Math.PI);
			expect(thetaPrime).toBeLessThanOrEqual(Math.PI);
			expect(Math.sin(thetaPrime)).toBeCloseTo(Math.sin(theta));
			expect(Math.cos(thetaPrime)).toBeCloseTo(Math.cos(theta));
		}
	});
});