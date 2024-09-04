import { Color4, Rect2, TextComponent, Vec2 } from '../lib';
import SVGLoader, { SVGLoaderLoadMethod } from './SVGLoader';
import createEditor from '../testing/createEditor';

describe('SVGLoader', () => {
	// Run all tests with both load methods
	describe.each([
		SVGLoaderLoadMethod.DOMParser, SVGLoaderLoadMethod.IFrame,
	])('should load SVGs correctly from strings', (loadMethod) => {
		it('should correctly load x/y-positioned text nodes', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg>
					<text>Testing...</text>
					<text y='100'>Test 2...</text>
					<text x='100'>Test 3...</text>
					<text x='100' y='100'>Test 3...</text>
			
					<!-- Transform matrix: translate by (100,0) -->
					<text style='transform: matrix(1,0,0,1,100,0);'>Test 3...</text>
				</svg>
			`, { sanitize: true, loadMethod }));
			const elems = editor.image
				.getElementsIntersectingRegion(new Rect2(-1000, -1000, 10000, 10000))
				.filter(elem => elem instanceof TextComponent);
			expect(elems).toHaveLength(5);
			const topLefts = elems.map(elem => elem.getBBox().topLeft);

			// Top-left of Testing... should be (0, 0) ± 10 pixels (objects are aligned based on baseline)
			expect(topLefts[0]).objEq(Vec2.of(0, 0), 10);

			expect(topLefts[1].y - topLefts[0].y).toBe(100);
			expect(topLefts[1].x - topLefts[0].x).toBe(0);

			expect(topLefts[2].y - topLefts[0].y).toBe(0);
			expect(topLefts[2].x - topLefts[0].x).toBe(100);

			expect(topLefts[4].x - topLefts[0].x).toBe(100);
			expect(topLefts[4].y - topLefts[0].y).toBe(0);
		});

		it('should correctly load tspans within texts nodes', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg>
					<text>
						Testing...
						<tspan x='0' y='100'>Test 2...</tspan>
						<tspan x='0' y='200'>Test 2...</tspan>
					</text>
				</svg>
			`, { sanitize: true, loadMethod }));

			const elem = editor.image
				.getElementsIntersectingRegion(new Rect2(-1000, -1000, 10000, 10000))
				.filter(elem => elem instanceof TextComponent)[0];
			expect(elem).toBeTruthy();
			expect(elem.getBBox().topLeft.y).toBeLessThan(0);
			expect(elem.getBBox().topLeft.x).toBe(0);
			expect(elem.getBBox().h).toBeGreaterThan(200);
		});

		it('should correctly load text object colors', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg>
					<text style="fill: #ff0000;">
						Testing...
						<tspan x='0' y='100'>Test 2...</tspan>
						<tspan x='0' y='200'>Test 2...</tspan>
					</text>
				</svg>
			`, { sanitize: true, loadMethod }));

			const elem = editor.image
				.getElementsIntersectingRegion(new Rect2(-1000, -1000, 10000, 10000))
				.filter(elem => elem instanceof TextComponent)[0];
			expect(elem).toBeTruthy();
			expect(elem.getStyle().color).objEq(Color4.red);
		});

		it('tspans without specified font-sizes should inherit their font size from their parent element', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg>
					<text style='font-size: 22px;'>
						Testing...
						<tspan>Test 2...</tspan>
						<tspan>Test 3...</tspan>
						<tspan style='font-size: 3px;'>Test 4...</tspan>
					</text>
				</svg>
			`, { sanitize: true, loadMethod }));
			const elem = editor.image
				.getAllElements()
				.filter(elem => elem instanceof TextComponent)[0];
			expect(elem).toBeTruthy();

			// Ensure each child object has the correct size
			expect(elem.serialize().data).toMatchObject({
				'textObjects': [
					{ },
					{
						'json':
						{
							'textObjects': [{ 'text': 'Test 2...' }],
							'style': {
								'size': 22,
							}
						}
					},
					{ },
					{
						'json': {
							'textObjects': [{ 'text': 'Test 3...' }],
							'style': {
								'size': 22
							}
						}
					},
					{ },
					{
						'json': {
							'textObjects': [{ 'text': 'Test 4...' }],
							'style': {
								'size': 3,
							}
						}
					},
					{ }
				],

				'style': {
					'size': 22,
				}
			});
		});

		it('should load autoresize attribute from a saved SVG', async () => {
			const editor = createEditor();

			// Load from an image with auto-resize enabled and a size that
			// doesn't match its content.
			await editor.loadFrom(SVGLoader.fromString(`
				<svg
					viewBox="0 0 500 500"
					width="500" height="500"
					class="js-draw--autoresize"
					version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M325,127 l0-146 l-186,0 l0,146 l186,0" fill="#ffffff" class="js-draw-image-background"/>
					<path d="M1,-1 l10,10" fill="none" stroke="#803380" stroke-width="4"/>
				</svg>
			`, { loadMethod }));

			// Should have autoresize enabled
			expect(editor.image.getAutoresizeEnabled()).toBe(true);

			// Should have the correct bounding box (note: padded by half stroke-width
			// on all sides).
			expect(editor.image.getImportExportRect()).objEq(new Rect2(-1, -3, 14, 14));
		});
	});
});