import { toRoundedString } from './toRoundedString';

describe('toRoundedString', () => {
	it('should round up numbers endings similar to .999999999999999', () => {
		expect(toRoundedString(0.999999999)).toBe('1');
		expect(toRoundedString(0.899999999)).toBe('0.9');
		expect(toRoundedString(9.999999999)).toBe('10');
		expect(toRoundedString(-10.999999999)).toBe('-11');
	});

	it('should round up numbers similar to 10.999999998999996', () => {
		expect(toRoundedString(10.999999998999996)).toBe('11');
	});

	it('should round strings with multiple digits after the ending decimal points', () => {
		expect(toRoundedString(292.2 - 292.8)).toBe('-0.6');
	});

	it('should round down strings ending endings similar to .00000001', () => {
		expect(toRoundedString(10.00000001)).toBe('10');
	});
});