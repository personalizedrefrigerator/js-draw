
import { Mat33, Vec2 } from '@js-draw/math';
import Viewport from '../../Viewport';
import DummyRenderer from './DummyRenderer';

const makeRenderer = (): [DummyRenderer, Viewport] => {
	const viewport = new Viewport(() => {});
	return [ new DummyRenderer(viewport), viewport ];
};

describe('DummyRenderer', () => {
	it('should correctly calculate the size of a pixel on the screen', () => {
		const [ renderer, viewport ] = makeRenderer();
		viewport.updateScreenSize(Vec2.of(100, 100));
		viewport.resetTransform(Mat33.identity);

		expect(1/viewport.getScaleFactor()).toBe(1);
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(1);

		// Updating the translation matrix shouldn't affect the size of a pixel on the
		// screen.
		renderer.setTransform(Mat33.translation(Vec2.of(-1, -2)));
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(1);
		viewport.resetTransform(Mat33.translation(Vec2.of(3, 4)));
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(1);

		// Scale objects by a factor of 2 when drawing
		renderer.setTransform(Mat33.scaling2D(2));
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(2);
		viewport.resetTransform(Mat33.scaling2D(0.5));

		// When a renderer transform is set, **only** the renderer transform should be used.
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(2);
		renderer.setTransform(null);
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(0.5);

		// Rotating should not affect the size of a pixel
		renderer.setTransform(Mat33.zRotation(Math.PI / 4).rightMul(Mat33.scaling2D(4)));
		expect(renderer.getSizeOfCanvasPixelOnScreen()).toBe(4);
	});
});