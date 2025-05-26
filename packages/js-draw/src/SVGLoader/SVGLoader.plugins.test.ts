import { Color4 } from '@js-draw/math';
import { Stroke } from '../lib';
import SVGLoader, { SVGLoaderPlugin } from './SVGLoader';

describe('SVGLoader.plugins', () => {
	test('should support custom plugin callbacks', async () => {
		let visitCount = 0;
		let skipCount = 0;
		const plugin: SVGLoaderPlugin = {
			async visit(node, control) {
				if (node.hasAttribute('data-test')) {
					control.addComponent(Stroke.fromFilled('m0,0 l10,10 l-10,0 z', Color4.red));
					visitCount++;
					return true;
				} else {
					skipCount++;
				}
				return false;
			},
		};

		const loader = SVGLoader.fromString(
			`
			<svg>
				<text data-test>Testing...</text>
				<text data-test>Test 2...</text>
				<text y='100'>Test 2...</text>
			</svg>
		`,
			{
				plugins: [plugin],
			},
		);
		const onAddListener = jest.fn();
		const onProgressListener = jest.fn();
		await loader.start(onAddListener, onProgressListener);

		expect(visitCount).toBe(2);
		expect(skipCount).toBeGreaterThanOrEqual(1);
	});
});
