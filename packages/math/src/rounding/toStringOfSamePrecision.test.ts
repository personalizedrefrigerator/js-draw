import { toStringOfSamePrecision } from './toStringOfSamePrecision';

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
	expect(toStringOfSamePrecision(-14.20000000000002, '.000001', '-11')).toBe('-14.2');
});
