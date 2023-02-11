import Color4 from '../Color4';
import { Path, Rect2 } from '../math/lib';
import createEditor from '../testing/createEditor';
import ImageBackground, { BackgroundType, imageBackgroundCSSClassName } from './ImageBackground';

describe('ImageBackground', () => {
	it('should render to fill exported SVG', () => {
		const editor = createEditor();
		const background = new ImageBackground(BackgroundType.SolidColor, Color4.green);
		editor.image.addElement(
			background
		).apply(editor);

		const expectedImportExportRect = new Rect2(-10, 10, 15, 20);
		editor.setImportExportRect(expectedImportExportRect).apply(editor);
		expect(editor.getImportExportRect()).objEq(expectedImportExportRect);

		expect(background.getBBox()).objEq(expectedImportExportRect);

		const rendered = editor.toSVG();
		const renderedBackground = rendered.querySelector(`.${imageBackgroundCSSClassName}`);

		if (renderedBackground === null) {
			throw new Error('ImageBackground did not render in exported SVG');
		}

		expect(renderedBackground.tagName.toLowerCase()).toBe('path');

		const pathString = renderedBackground.getAttribute('d')!;
		expect(pathString).not.toBeNull();

		const path = Path.fromString(pathString);
		expect(path.bbox).objEq(editor.getImportExportRect());
	});
});