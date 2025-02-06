import { InputEvtType, PasteEvent } from '../inputEvents';
import TextComponent from '../components/TextComponent';
import createEditor from '../testing/createEditor';
import PasteHandler from './PasteHandler';
import { EditorSettings } from '../Editor';
import Stroke from '../components/Stroke';
import { Color4 } from '@js-draw/math';
import { SVGLoaderPlugin } from '../SVGLoader/SVGLoader';
import { EditorImage } from '../lib';

const createTestEditor = (settigs?: Partial<EditorSettings>) => {
	const editor = createEditor(settigs);
	const pasteTool = editor.toolController.getMatchingTools(PasteHandler)[0];
	return {
		editor,
		pasteTool,
		testPaste: (event: PasteEvent) => {
			return new Promise<void>((resolve) => {
				pasteTool.onPaste(event, resolve);
			});
		},
	};
};

const textFromImage = (image: EditorImage) => {
	return image
		.getAllElements()
		.filter((elem) => elem instanceof TextComponent)
		.map((elem) => elem.getText());
};

describe('PasteHandler', () => {
	test('should interpret non-SVG text/plain data as a text component', async () => {
		const { editor, testPaste } = createTestEditor();

		await testPaste({
			kind: InputEvtType.PasteEvent,
			data: 'Test text/plain',
			mime: 'text/plain',
		});

		const allText = textFromImage(editor.image);
		expect(allText).toEqual(['Test text/plain']);
	});

	test('should interpret text/plain data starting with <svg as SVG data', async () => {
		const { editor, testPaste } = createTestEditor();

		await testPaste({
			kind: InputEvtType.PasteEvent,
			data: '<svg><text>Test</text></svg>',
			mime: 'text/plain',
		});

		const allText = textFromImage(editor.image);
		expect(allText).toEqual(['Test']);
	});

	test('should allow processing pasted data with SVG loader plugins', async () => {
		const plugin: SVGLoaderPlugin = {
			async visit(node, loader) {
				loader.addComponent(Stroke.fromFilled('m0,0 l10,10 z', Color4.red));
				return true;
			},
		};

		const { editor, testPaste } = createTestEditor({
			svg: {
				loaderPlugins: [plugin],
			},
		});

		await testPaste({
			kind: InputEvtType.PasteEvent,
			data: '<svg><text>Test</text></svg>',
			mime: 'text/plain',
		});

		const allText = textFromImage(editor.image);
		// Should have added all components as strokes instead of text.
		expect(allText).toEqual([]);
		expect(editor.image.getAllElements().filter((comp) => comp instanceof Stroke)).toHaveLength(1);
	});
});
