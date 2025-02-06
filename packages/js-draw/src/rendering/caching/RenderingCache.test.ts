/* @jest-environment jsdom */

import DummyRenderer from '../renderers/DummyRenderer';
import { createCache } from './testUtils';
import Stroke from '../../components/Stroke';
import { Path, Mat33, Color4 } from '@js-draw/math';
import EditorImage from '../../image/EditorImage';
import Viewport from '../../Viewport';
import { pathToRenderable } from '../RenderablePathSpec';

describe('RenderingCache', () => {
	const testPath = Path.fromString('M0,0 l100,500 l-20,20 L-100,-100');
	const testStroke = new Stroke([pathToRenderable(testPath, { fill: Color4.purple })]);

	it('should create a root node large enough to contain the viewport', () => {
		let lastRenderer: DummyRenderer | null = null;
		let allocdRenderers: number = 0;

		const { editor, cache } = createCache((renderer) => {
			allocdRenderers++;
			lastRenderer = renderer;
		});
		const screenRenderer = editor.display.getDryInkRenderer() as DummyRenderer;

		// No objects: Should not create a renderer.
		expect(lastRenderer).toBeNull();
		editor.image.renderWithCache(screenRenderer, cache, editor.viewport);
		expect(lastRenderer).toBeNull();

		editor.dispatch(EditorImage.addComponent(testStroke));
		editor.image.renderWithCache(screenRenderer, cache, editor.viewport);

		expect(allocdRenderers).toBeGreaterThanOrEqual(1);
		expect(lastRenderer).not.toBeNull();
		expect(lastRenderer!.renderedPathCount).toBe(1);

		editor.dispatch(Viewport.transformBy(Mat33.scaling2D(0.1)));
		editor.image.renderWithCache(screenRenderer, cache, editor.viewport);
		expect(allocdRenderers).toBe(1);
		expect(lastRenderer!.renderedPathCount).toBe(1);
		expect(screenRenderer.renderedPathCount).toBeGreaterThanOrEqual(1);
	});
});
