import Color4 from '../Color4';
import Mat33 from '../math/Mat33';
import Rect2 from '../math/Rect2';
import AbstractComponent from './AbstractComponent';
import Text, { TextStyle } from './Text';

const estimateTextBounds = (text: string, style: TextStyle): Rect2 => {
	const widthEst = text.length * style.size;
	const heightEst = style.size;

	// Text is drawn with (0, 0) as its baseline. As such, the majority of the text's height should
	// be above (0, 0).
	return new Rect2(0, -heightEst * 2/3, widthEst, heightEst);
};

// Don't use the default Canvas-based text bounding code. The canvas-based code may not work
// with jsdom.
AbstractComponent.registerComponent('text', (data: string) => Text.deserializeFromString(data, estimateTextBounds));

describe('Text', () => {
	it('should be serializable', () => {
		const style: TextStyle = {
			size: 12,
			fontFamily: 'serif',
			renderingStyle: { fill: Color4.black },
		};
		const text = new Text(
			[ 'Foo' ], Mat33.identity, style, estimateTextBounds
		);
		const serialized = text.serialize();
		const deserialized = AbstractComponent.deserialize(serialized) as Text;
		expect(deserialized.getBBox()).objEq(text.getBBox());
		expect(deserialized['getText']()).toContain('Foo');
	});
});