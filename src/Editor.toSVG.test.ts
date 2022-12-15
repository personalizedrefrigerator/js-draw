import { TextStyle } from './components/TextComponent';
import { Color4, Mat33, Rect2, TextComponent, EditorImage, Vec2 } from './lib';
import SVGLoader from './SVGLoader';
import createEditor from './testing/createEditor';

describe('Editor.toSVG', () => {
	it('should correctly nest text objects', async () => {
		const editor = createEditor();
		const textStyle: TextStyle = {
			fontFamily: 'sans', size: 12, renderingStyle: { fill: Color4.black }
		};
		const text = new TextComponent([
			'Testing...',
			new TextComponent([ 'Test 2' ], Mat33.translation(Vec2.of(0, 100)), textStyle),
		], Mat33.identity, textStyle);
		editor.dispatch(EditorImage.addElement(text));

		const matches = editor.image.getElementsIntersectingRegion(new Rect2(4, -100, 100, 100));
		expect(matches).toHaveLength(1);
		expect(text).not.toBeNull();

		const asSVG = editor.toSVG();
		const allTSpans = [ ...asSVG.querySelectorAll('tspan') ];
		expect(allTSpans).toHaveLength(1);
		expect(allTSpans[0].getAttribute('x')).toBe('0');
		expect(allTSpans[0].getAttribute('y')).toBe('100');
		expect(allTSpans[0].style.transform).toBe('');
	});

	it('should preserve text child size/placement while not saving additional properties', async () => {
		const secondLineText = 'This is a test of a thing that has been known to break. Will this test catch the issue?';
		const thirdLineText = 'This is a test of saving/loading multi-line text...';

		const editor = createEditor();
		await editor.loadFrom(SVGLoader.fromString(`
			<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
				<style id="js-draw-style-sheet">
					path {
						stroke-linecap:round;
						stroke-linejoin:round;
					}
				</style>
				<text style="transform: matrix(1, 0, 0, 1, 12, 35); font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">Testing...<tspan x="3" y="40" style="font-family: sans-serif; font-size: 33px; fill: rgb(128, 51, 128);">${secondLineText}</tspan><tspan x="0" y="72" style="font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">${thirdLineText}</tspan><tspan x="0" y="112" style="font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">Will it pass or fail?</tspan></text>
			</svg>
		`, true));

		expect(
			editor.image.getAllElements().filter(elem => elem instanceof TextComponent)
		).toHaveLength(1);

		const asSVG = editor.toSVG();
		const textObject = asSVG.querySelector('text');

		if (!textObject) {
			throw new Error('No text object found');
		}

		expect(textObject.style.transform.replace(/\s+/g, '')).toBe('matrix(1,0,0,1,12,35)');
		expect(textObject.style.fontFamily).toBe('sans-serif');
		expect(textObject.style.fontSize).toBe('32px');

		const childTextNodes = textObject.querySelectorAll('tspan');
		expect(childTextNodes).toHaveLength(3);
		const firstChild = childTextNodes[0];

		expect(firstChild.textContent).toBe(secondLineText);
		expect(firstChild.style.transform).toBe('');
		expect(firstChild.style.fontSize).toBe('33px');
		expect(firstChild.getAttribute('x')).toBe('3');
		expect(firstChild.getAttribute('y')).toBe('40');

		// Should not save a fontSize when not necessary (same fill as parent text node)
		const secondChild = childTextNodes[1];
		expect(secondChild.style.fontSize ?? '').toBe('');

		// Should not save additional "style" attributes when not necessary
		// TODO: Uncomment before some future major version release. Currently a "fill" is set for every
		//  tspan to work around a loading bug.
		//expect(secondChild.outerHTML).toBe(`<tspan x="0" y="72">${thirdLineText}</tspan>`);
	});
});
