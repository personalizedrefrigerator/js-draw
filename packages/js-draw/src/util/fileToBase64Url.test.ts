import fileToBase64Url from './fileToBase64Url';

// Use NodeJS's Blob (jsdom's Blob doesn't support .arrayBuffer).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Blob } = require('node:buffer');

const originalFileReader = window.FileReader;

describe('fileToBase64Url', () => {
	afterEach(() => {
		window.FileReader = originalFileReader;
	});

	it('should convert a Blob to a base64 URL if FileReader can\'t load', async () => {
		window.FileReader = undefined as any;

		const onWarning = jest.fn();

		const blob = new Blob([ new Uint8Array([ 1, 2, 3, 4, ]).buffer ], { type: 'text/plain' });
		expect(await fileToBase64Url(blob, { onWarning })).toBe('data:text/plain;base64,AQIDBA==');

		// Should have triggered a warning
		expect(onWarning).toHaveBeenCalled();
	});
});
