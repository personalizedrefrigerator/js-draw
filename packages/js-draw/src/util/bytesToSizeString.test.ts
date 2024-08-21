import bytesToSizeString from './bytesToSizeString';

describe('bytesToSizeString', () => {
	test.each([
		[ 1024, { size: 1, units: 'KiB' } ],
		[ 1024 * 1024, { size: 1, units: 'MiB' } ],
		[ 256, { size: 256, units: 'B' } ],
	])('should correctly assign units for different byte values', (size, expected) => {
		expect(bytesToSizeString(size)).toMatchObject(expected);
	});
});