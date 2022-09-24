import { cleanUpNumber, toRoundedString, toStringOfSamePrecision } from './rounding';

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

	// Handling this creates situations with potential error:
	//it('should round strings with multiple digits after the ending decimal points', () => {
	//	expect(toRoundedString(292.2 - 292.8)).toBe('-0.6');
	//});

	it('should round down strings ending endings similar to .00000001', () => {
		expect(toRoundedString(10.00000001)).toBe('10');
		expect(toRoundedString(-30.00000001)).toBe('-30');
	});

	it('should not round numbers insufficiently close to the next', () => {
		expect(toRoundedString(-10.9999)).toBe('-10.9999');
		expect(toRoundedString(-10.0001)).toBe('-10.0001');
		expect(toRoundedString(-10.123499)).toBe('-10.123499');
		expect(toRoundedString(0.00123499)).toBe('.00123499');
	});
});

it('toStringOfSamePrecision', () => {
	expect(toStringOfSamePrecision(1.23456, '1.12')).toBe('1.23');
	expect(toStringOfSamePrecision(1.23456, '1.120')).toBe('1.235');
	expect(toStringOfSamePrecision(1.23456, '1.1')).toBe('1.2');
	expect(toStringOfSamePrecision(1.23456, '1.1', '5.32')).toBe('1.23');
	expect(toStringOfSamePrecision(-1.23456, '1.1', '5.32')).toBe('-1.23');
	expect(toStringOfSamePrecision(-1.99999, '1.1', '5.32')).toBe('-2');
	expect(toStringOfSamePrecision(1.99999, '1.1', '5.32')).toBe('2');
	expect(toStringOfSamePrecision(1.89999, '1.1', '5.32')).toBe('1.9');
	expect(toStringOfSamePrecision(9.99999999, '-1.1234')).toBe('10');
	expect(toStringOfSamePrecision(9.999999998999996, '100')).toBe('10');
	expect(toStringOfSamePrecision(0.000012345, '0.000012')).toBe('.000012');
	expect(toStringOfSamePrecision(0.000012645, '.000012')).toBe('.000013');
	expect(toStringOfSamePrecision(-0.09999999999999432, '291.3')).toBe('-.1');
	expect(toStringOfSamePrecision(-0.9999999999999432, '291.3')).toBe('-1');
	expect(toStringOfSamePrecision(9998.9, '.1', '-11')).toBe('9998.9');
});

it('cleanUpNumber', () => {
	expect(cleanUpNumber('000.0000')).toBe('0');
	expect(cleanUpNumber('-000.0000')).toBe('0');
	expect(cleanUpNumber('0.0000')).toBe('0');
	expect(cleanUpNumber('0.001')).toBe('.001');
	expect(cleanUpNumber('-0.001')).toBe('-.001');
	expect(cleanUpNumber('-0.000000001')).toBe('-.000000001');
	expect(cleanUpNumber('-0.00000000100')).toBe('-.000000001');
	expect(cleanUpNumber('1234')).toBe('1234');
	expect(cleanUpNumber('1234.5')).toBe('1234.5');
	expect(cleanUpNumber('1234.500')).toBe('1234.5');
});