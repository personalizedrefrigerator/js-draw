console.log('Testing imports...');

import { TextComponent, StrokeComponent } from 'js-draw/components';
import './dom-mocks.cjs';
import { Editor } from 'js-draw/Editor';

if (!Editor) {
	throw new Error('Failed to import Editor');
}

if (!TextComponent.fromLines) {
	throw new Error('Failed to import module TextComponent');
}

if (!StrokeComponent.deserializeFromJSON) {
	throw new Error('Failed to import StrokeComponent');
}
