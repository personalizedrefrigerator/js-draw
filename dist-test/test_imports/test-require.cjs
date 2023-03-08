console.log('Testing require()...');

const { Color4 } = require('js-draw/Color4');
const { Vec2, Mat33 } = require('js-draw/math');

// TODO: Test require('js-draw') (requires removing Coloris because
// Coloris depends on the DOM when first loaded).

if (Vec2.of(1, 1).x !== 1) {
    throw new Error('Failed to import module Vec2');
}

if (!Mat33.identity) {
    throw new Error('Failed to import Mat33 via CommonJS');
}

if (!Color4.red) {
    throw new Error('Failed to import Color4 from js-draw');
}