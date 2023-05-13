import { ImageComponent, Mat33 } from '../../lib';
import createEditor from '../../testing/createEditor';
import TextOnlyRenderer from './TextOnlyRenderer';

describe('TextOnlyRenderer', () => {
	it('should summarize the number of visible image nodes', () => {
		const editor = createEditor();

		const htmlImage = new Image();
		htmlImage.width = 500;
		htmlImage.height = 200;

		const image = new ImageComponent({
			transform: Mat33.identity,
			image: htmlImage,
			base64Url: '',
			label: 'Testing...',
		});
		editor.dispatch(editor.image.addElement(image));

		const textRenderer = new TextOnlyRenderer(editor.viewport, editor.localization);
		editor.image.render(textRenderer, editor.viewport);

		// Should contian number of image nodes and the image description
		expect(textRenderer.getDescription()).toContain('Testing...');
		expect(textRenderer.getDescription()).toContain('1');

		textRenderer.clear();

		// After clearing, should not contain description of the image/image count
		expect(textRenderer.getDescription()).not.toContain('Testing...');
		expect(textRenderer.getDescription()).not.toContain('1');
	});
});