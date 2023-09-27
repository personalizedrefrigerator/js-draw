console.log('Testing require()...');

// TODO: Test require('js-draw') (requires removing Coloris because
// Coloris depends on the DOM when first loaded).

const { TextComponent, StrokeComponent } = require('js-draw/components');

if (!TextComponent.fromLines) {
	throw new Error('Failed to import module TextComponent');
}

if (!StrokeComponent.deserializeFromJSON) {
	throw new Error('Failed to import StrokeComponent');
}
