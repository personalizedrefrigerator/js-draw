import { toRoundedString } from './toRoundedString';

describe('toRoundedString', () => {
	it('should round up numbers endings similar to .999999999999999', () => {
		expect(toRoundedString(0.999999999)).toBe('1');
		expect(toRoundedString(0.899999999)).toBe('.9');
		expect(toRoundedString(9.999999999)).toBe('10');
		expect(toRoundedString(-10.999999999)).toBe('-11');
	});

	it('should round up numbers similar to 10.999999998', () => {
		expect(toRoundedString(10.999999998)).toBe('11');
	});

	it('should round strings with multiple digits after the ending decimal points', () => {
		expect(toRoundedString(292.2 - 292.8)).toBe('-.6');
		expect(toRoundedString(4.06425600000023)).toBe('4.064256');
	});

	it('should round down strings ending endings similar to .00000001', () => {
		expect(toRoundedString(10.00000001)).toBe('10');
		expect(toRoundedString(-30.00000001)).toBe('-30');
		expect(toRoundedString(-14.20000000000002)).toBe('-14.2');
	});

	it('should not round numbers insufficiently close to the next', () => {
		expect(toRoundedString(-10.9999)).toBe('-10.9999');
		expect(toRoundedString(-10.0001)).toBe('-10.0001');
		expect(toRoundedString(-10.123499)).toBe('-10.123499');
		expect(toRoundedString(0.00123499)).toBe('.00123499');
	});
});
