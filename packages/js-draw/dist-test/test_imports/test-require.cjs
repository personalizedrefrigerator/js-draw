console.log('Testing require()...');

// TODO: Test require('js-draw') (requires removing Coloris because
// Coloris depends on the DOM when first loaded).

const { TextComponent, StrokeComponent } = require('js-draw/components');
require('./dom-mocks.cjs');
const { Editor } = require('js-draw/Editor');

if (!Editor) {
	throw new Error('Failed to import Editor');
}

if (!TextComponent.fromLines) {
	throw new Error('Failed to import module TextComponent');
}

if (!StrokeComponent.deserializeFromJSON) {
	throw new Error('Failed to import StrokeComponent');
}
