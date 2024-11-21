import { Path, Rect2, Color4, Vec2 } from '@js-draw/math';
import createEditor from '../testing/createEditor';
import AbstractComponent from './AbstractComponent';
import BackgroundComponent, {
	BackgroundType,
	imageBackgroundCSSClassName,
} from './BackgroundComponent';

describe('ImageBackground', () => {
	it('should render to fill exported SVG', () => {
		const editor = createEditor();
		const background = new BackgroundComponent(BackgroundType.SolidColor, Color4.green);
		editor.image.addElement(background).apply(editor);

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

	it('should be serializable', () => {
		const background = BackgroundComponent.ofGrid(Color4.red, 10, Color4.purple);

		const deserializedBackground = AbstractComponent.deserialize(
			background.serialize(),
		) as BackgroundComponent;
		expect(deserializedBackground.getBackgroundType()).toBe(BackgroundType.Grid);
		expect(deserializedBackground.getStyle().color).objEq(Color4.red);
		expect(deserializedBackground.getMainColor()).objEq(Color4.red);
		expect(deserializedBackground.getGridSize()).toBe(background.getGridSize());
		expect(deserializedBackground.getSecondaryColor()).objEq(Color4.purple);
	});

	it('should match image size on save if autoresize is enabled', () => {
		const editor = createEditor();
		editor.dispatch(editor.image.setAutoresizeEnabled(true));

		// The editor is initially empty, so should have an empty import/export rect
		expect(editor.image.getImportExportRect().size).objEq(Vec2.zero);

		// Add a background
		const background = new BackgroundComponent(BackgroundType.SolidColor, Color4.green);
		editor.dispatch(editor.image.addElement(background));

		// Render to SVG and increase the output size
		const asSVG = editor.toSVG({ minDimension: 50 });
		expect(asSVG.getAttribute('width')).toBe('50');
		expect(asSVG.getAttribute('height')).toBe('50');

		// The background should have the expected path/size
		// TODO: This test currently relies too heavily on non-background-specific implementation
		//       details. Ideally, this should be renderer-independent.
		expect(
			asSVG.querySelectorAll(`path.${imageBackgroundCSSClassName}[d="M50,50L50,0L0,0L0,50L50,50"]`),
		).toHaveLength(1);
	});
});
