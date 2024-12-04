import cleanUpNumber from './cleanUpNumber';

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
	expect(cleanUpNumber('1234.00500')).toBe('1234.005');
	expect(cleanUpNumber('1234.001234500')).toBe('1234.0012345');
	expect(cleanUpNumber('1.1368683772161603e-13')).toBe('0');
});
