import Color4 from './Color4';
import { imageBackgroundCSSClassName } from './components/BackgroundComponent';
import { RestyleableComponent } from './lib';
import SVGLoader from './SVGLoader';
import createEditor from './testing/createEditor';

describe('Editor.loadFrom', () => {
	it('should remove existing BackgroundComponents when loading new BackgroundComponents', async () => {
		const editor = createEditor();
		await editor.dispatch(editor.setBackgroundColor(Color4.red));

		let backgroundComponents = editor.image.getBackgroundComponents();
		expect(backgroundComponents).toHaveLength(1);
		expect((backgroundComponents[0] as RestyleableComponent).getStyle().color).objEq(Color4.red);

		await editor.loadFrom(SVGLoader.fromString(`<svg viewBox='0 0 100 100'>
			<path class='${imageBackgroundCSSClassName}' d='m0,0 L100,0 L100,100 L0,100 z' fill='#000'/>
		</svg>`, true));

		backgroundComponents = editor.image.getBackgroundComponents();
		expect(backgroundComponents).toHaveLength(1);
		expect((backgroundComponents[0] as RestyleableComponent).getStyle().color).objEq(Color4.black);
	});
});