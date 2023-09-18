import { Color4, Mat33 } from '@js-draw/math';
import Viewport from '../../Viewport';
import SVGRenderer from './SVGRenderer';

const makeSVGRenderer = () => {
	const viewport = new Viewport(() => {});
	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	return { svgElement, renderer: new SVGRenderer(svgElement, viewport) };
};

describe('SVGRenderer', () => {
	it('text highp and CSS transforms should match', () => {
		const testTransforms = [
			Mat33.identity,
			new Mat33(
				1, 2, 3.45678910,
				3, 4, 5.67891011,
				0, 0, 1,
			),
			new Mat33(
				-1, -2, 3,
				4, 5, 6,
				0, 0, 1,
			),
			new Mat33(
				1, 2, 0.00001,
				3, 4, -0.00000123,
				0, 0, 1,
			),
		];

		for (const transform of testTransforms) {
			const { svgElement, renderer } = makeSVGRenderer();

			renderer.drawText('test', transform, {
				size: 12,
				fontFamily: 'font',
				fontWeight: 'bold',
				renderingStyle: {
					fill: Color4.red,
				},
			});

			expect(svgElement.querySelectorAll('text')).toHaveLength(1);
			const textElement = svgElement.querySelector('text')!;
			expect(textElement.textContent).toBe('test');

			const transformFromProperty = Mat33.fromCSSMatrix(textElement.getAttribute('data-highp-transform') ?? '');
			const transformFromCSS = Mat33.fromCSSMatrix(textElement.style.transform);

			expect(transformFromProperty).objEq(transformFromCSS);
			expect(transformFromCSS).objEq(transform);
		}
	});
});
