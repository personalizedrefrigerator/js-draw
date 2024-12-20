import { InputEvtType, PasteEvent } from '../inputEvents';
import TextComponent from '../components/TextComponent';
import createEditor from '../testing/createEditor';
import PasteHandler from './PasteHandler';

const createTestEditor = () => {
	const editor = createEditor();
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

describe('PasteHandler', () => {
	test('should interpret non-SVG text/plain data as a text component', async () => {
		const { editor, testPaste } = createTestEditor();

		await testPaste({
			kind: InputEvtType.PasteEvent,
			data: 'Test text/plain',
			mime: 'text/plain',
		});

		const allText = editor.image
			.getAllElements()
			.filter((elem) => elem instanceof TextComponent)
			.map((elem) => elem.getText());
		expect(allText).toEqual(['Test text/plain']);
	});

	test('should interpret text/plain data starting with <svg as SVG data', async () => {
		const { editor, testPaste } = createTestEditor();

		await testPaste({
			kind: InputEvtType.PasteEvent,
			data: '<svg><text>Test</text></svg>',
			mime: 'text/plain',
		});

		const allText = editor.image
			.getAllElements()
			.filter((elem) => elem instanceof TextComponent)
			.map((elem) => elem.getText());
		expect(allText).toEqual(['Test']);
	});
});
