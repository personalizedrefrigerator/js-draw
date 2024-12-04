console.log('Testing require()...');

// eslint-disable-next-line @typescript-eslint/no-require-imports -- This is a .cjs file
const { Vec2, Color4, Mat33 } = require('@js-draw/math');

if (Vec2.of(1, 1).x !== 1) {
	throw new Error('Failed to import module Vec2');
}

if (!Mat33.identity) {
	throw new Error('Failed to import Mat33 via CommonJS');
}

if (!Color4.red) {
	throw new Error('Failed to import Color4 from js-draw');
}
