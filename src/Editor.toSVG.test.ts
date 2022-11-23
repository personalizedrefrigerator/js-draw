import { TextStyle } from './components/TextComponent';
import { Color4, Mat33, Rect2, TextComponent, EditorImage, Vec2 } from './lib';
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
	});
});
