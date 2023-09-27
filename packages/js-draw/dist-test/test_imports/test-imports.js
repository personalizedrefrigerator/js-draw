console.log('Testing imports...');

import { TextComponent, StrokeComponent } from 'js-draw/components';

if (!TextComponent.fromLines) {
	throw new Error('Failed to import module TextComponent');
}

if (!StrokeComponent.deserializeFromJSON) {
	throw new Error('Failed to import StrokeComponent');
}
