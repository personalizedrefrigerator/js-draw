import EditorImage from '../image/EditorImage';
import { Vec2, Mat33, Color4 } from '@js-draw/math';
import TextRenderingStyle from '../rendering/TextRenderingStyle';
import createEditor from '../testing/createEditor';
import AbstractComponent from './AbstractComponent';
import TextComponent, { TextTransformMode } from './TextComponent';


describe('TextComponent', () => {
	it('should be serializable', () => {
		const style: TextRenderingStyle = {
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

	it('should be deserializable', () => {
		const textComponent = TextComponent.deserializeFromString(`{
			"textObjects": [ { "text": "Foo" } ],
			"transform": [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ],
			"style": {
				"fontFamily": "sans",
				"size": 10,
				"renderingStyle": { "fill": "#000" }
			}
		}`);

		expect(textComponent.getText()).toBe('Foo');
		expect(textComponent.getTransform()).objEq(Mat33.identity);
		expect(textComponent.getStyle().color!).objEq(Color4.black);
		expect(textComponent.getTextStyle().fontFamily!).toBe('sans');
	});

	it('should be restylable', () => {
		const style: TextRenderingStyle = {
			size: 10,
			fontFamily: 'sans',
			renderingStyle: { fill: Color4.red },
		};
		const text = new TextComponent([ 'Foo' ], Mat33.identity, style);

		expect(text.getStyle().color).objEq(Color4.red);
		text.forceStyle({
			color: Color4.green,
		}, null);
		expect(text.getStyle().color).objEq(Color4.green);
		expect(text.getTextStyle().renderingStyle.fill).objEq(Color4.green);

		const restyleCommand = text.updateStyle({
			color: Color4.purple,
		});

		// Should queue a re-render after restyling.
		const editor = createEditor();
		EditorImage.addElement(text).apply(editor);

		editor.rerender();
		expect(editor.isRerenderQueued()).toBe(false);
		editor.dispatch(restyleCommand);
		expect(editor.isRerenderQueued()).toBe(true);

		// Undoing should reset to the correct color.
		expect(text.getStyle().color).objEq(Color4.purple);
		editor.history.undo();
		expect(text.getStyle().color).objEq(Color4.green);
	});

	it('calling forceStyle on the duplicate of a TextComponent should preserve the original\'s style', () => {
		const originalStyle: TextRenderingStyle = {
			size: 11,
			fontFamily: 'sans-serif',
			renderingStyle: { fill: Color4.purple, },
		};

		const text1 = new TextComponent([ 'Test' ], Mat33.identity, originalStyle);
		const text2 = text1.clone() as TextComponent;

		text1.forceStyle({
			color: Color4.red,
		}, null);

		expect(text2.getStyle().color).objEq(Color4.purple);
		expect(text1.getStyle().color).objEq(Color4.red);

		text2.forceStyle({
			textStyle: originalStyle,
		}, null);

		expect(text1.getStyle().color).objEq(Color4.red);
		expect(text2.getTextStyle()).toMatchObject(originalStyle);
	});

	describe('should position text components relatively or absolutely (bounding box tests)', () => {
		const baseStyle: TextRenderingStyle = {
			size: 12,
			fontFamily: 'sans-serif',
			renderingStyle: { fill: Color4.red },
		};

		it('strings should be placed relative to one another', () => {
			const str1 = 'test';
			const str2 = 'test2';

			const container = new TextComponent([ str1, str2 ], Mat33.identity, baseStyle);

			// Create separate components for str1 and str2 so we can check their individual bounding boxes
			const str1Component = new TextComponent([ str1 ], Mat33.identity, baseStyle);
			const str2Component = new TextComponent([ str2 ], Mat33.identity, baseStyle);

			const widthSum = str1Component.getBBox().width + str2Component.getBBox().width;
			const maxHeight = Math.max(str1Component.getBBox().height, str2Component.getBBox().height);
			expect(container.getBBox().size).objEq(Vec2.of(widthSum, maxHeight));
		});

		it('RELATIVE_X_ABSOLUTE_Y should work (relatively positioned along x, absolutely along y)', () => {
			const component1 = new TextComponent([ 'test' ], Mat33.identity, baseStyle);

			const componentTranslation = Vec2.of(10, 10);
			const component2 = new TextComponent(
				[ 'relatively' ],
				Mat33.translation(componentTranslation),
				baseStyle,
				TextTransformMode.RELATIVE_X_ABSOLUTE_Y
			);

			const component3 = new TextComponent(
				[ 'more of a test...' ],
				Mat33.translation(componentTranslation),
				baseStyle,
				TextTransformMode.RELATIVE_X_ABSOLUTE_Y
			);


			const container = new TextComponent([ component1, component2, component3 ], Mat33.identity, baseStyle);
			const expectedWidth =
				component1.getBBox().width
				// x should take the translation from each component into account.
				+ componentTranslation.x + component2.getBBox().width
				+ componentTranslation.x + component3.getBBox().width;
			const expectedHeight = Math.max(
				component1.getBBox().height,

				// Absolute y: Should *not* take into account both components' y translations
				componentTranslation.y + component3.getBBox().height
			);
			expect(container.getBBox().size).objEq(Vec2.of(expectedWidth, expectedHeight));
		});

		it('RELATIVE_Y_ABSOLUTE_X should work (relatively positioned along y, absolutely along x)', () => {
			const firstComponentTranslation = Vec2.of(1000, 1000);
			const component1 = new TextComponent(
				[ '...' ],

				// The translation of the first component shouldn't affect the Y size of the bounding box.
				Mat33.translation(firstComponentTranslation),

				baseStyle);

			const componentTranslation = Vec2.of(10, 20);
			const component2 = new TextComponent(
				[ 'Test!' ],
				Mat33.translation(componentTranslation),
				baseStyle,
				TextTransformMode.RELATIVE_Y_ABSOLUTE_X
			);

			const component3 = new TextComponent(
				[ 'Even more of a test.' ],
				Mat33.translation(componentTranslation),
				baseStyle,
				TextTransformMode.RELATIVE_Y_ABSOLUTE_X
			);


			const container = new TextComponent([ component1, component2, component3 ], Mat33.identity, baseStyle);
			const expectedWidth =
				component1.getBBox().width

				// Space between the start of components 2 and 3 and the start of component 1
				+ firstComponentTranslation.x - componentTranslation.x;

			const expectedHeight =
				// Don't include component1.bbox.height: component1 overlaps with component 2 completely in y
				// similarly, component 2 overlaps completely with component3 in y.
				//
				// Note that while relative positioning is relative to the right edge of the baseline of the previous
				// item (when in left-to-right mode). Thus, x is adjusted automatically by the text width, while
				// y remains the same (if there is no additional translation).
				+ componentTranslation.y
				+ componentTranslation.y
				+ component3.getBBox().height;

			expect(container.getBBox().size).objEq(Vec2.of(expectedWidth, expectedHeight));
		});
	});
});
