import Color4 from '../Color4';
import Mat33 from '../math/Mat33';
import AbstractComponent from './AbstractComponent';
import TextComponent, { TextStyle } from './TextComponent';


describe('Text', () => {
	it('should be serializable', () => {
		const style: TextStyle = {
			size: 12,
			fontFamily: 'serif',
			renderingStyle: { fill: Color4.black },
		};
		const text = new TextComponent([ 'Foo' ], Mat33.identity, style);
		const serialized = text.serialize();
		const deserialized = AbstractComponent.deserialize(serialized) as TextComponent;
		expect(deserialized.getBBox()).objEq(text.getBBox());
		expect(deserialized['getText']()).toContain('Foo');
	});
});