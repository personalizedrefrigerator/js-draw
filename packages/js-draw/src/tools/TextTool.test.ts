import Editor from '../Editor';
import createEditor from '../testing/createEditor';
import sendPenEvent from '../testing/sendPenEvent';
import TextTool from './TextTool';
import { InputEvtType } from '../inputEvents';
import { Vec2 } from '@js-draw/math';
import fillInput from '../testing/fillHtmlInput';
import sendKeyPressRelease from '../testing/sendKeyPressRelease';
import { TextComponent } from '../components/lib';
import { assertTruthy } from '../util/assertions';

const getTextTool = (editor: Editor) => {
	return editor.toolController.getMatchingTools(TextTool)[0];
};

const getTextEditor = (editor: Editor): HTMLTextAreaElement | null => {
	return editor.getRootElement().querySelector('.textEditorOverlay textarea:not(.-hiding)');
};

const getEditorText = (editor: Editor) => {
	const textComponents = editor.image
		.getAllComponents()
		.filter((element) => element instanceof TextComponent);
	return textComponents.map((c) => c.getText()).join('\n');
};

describe('TextTool', () => {
	test.each([
		{ editorFontSetting: undefined },
		{ editorFontSetting: [] },
		{ editorFontSetting: ['foo'] },
		{ editorFontSetting: ['foo', 'bar'] },
		{ editorFontSetting: ['foo', 'bar', 'baz'] },
	])('should use an editor built-in font, where available', ({ editorFontSetting }) => {
		const editor = createEditor({
			text: { fonts: editorFontSetting },
		});
		const textTool = getTextTool(editor);
		expect(textTool.getTextStyle().fontFamily).toBe(editorFontSetting?.[0] ?? 'sans-serif');
	});

	test('should create an edit box when the editor is clicked', () => {
		const editor = createEditor();
		const textTool = getTextTool(editor);
		textTool.setEnabled(true);
		expect(getTextEditor(editor)).toBeFalsy();

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.zero);

		expect(getTextEditor(editor)).toBeTruthy();
	});

	test('pressing enter should finalize editing', () => {
		const editor = createEditor();
		const textTool = getTextTool(editor);
		textTool.setEnabled(true);

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.zero);

		const textArea = getTextEditor(editor);
		assertTruthy(textArea);

		fillInput(textArea, 'test...');
		sendKeyPressRelease(textArea, 'Enter');

		const textComponents = editor.image
			.getAllComponents()
			.filter((element) => element instanceof TextComponent);
		expect(textComponents).toHaveLength(1);

		expect(textComponents[0].getText()).toBe('test...');
	});

	test('clicking away from a text input should finalize editing', () => {
		const editor = createEditor();
		const textTool = getTextTool(editor);
		textTool.setEnabled(true);

		// Create an initial text
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.zero);

		let textArea = getTextEditor(editor);
		assertTruthy(textArea);

		fillInput(textArea, 'test!');
		textArea.dispatchEvent(new FocusEvent('blur'));

		expect(getEditorText(editor)).toBe('test!');
		expect(textArea.classList.contains('-hiding')).toBe(true);

		// Start a new text elsewhere
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(1_000, -101));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(1_000, -101));

		textArea = getTextEditor(editor);
		assertTruthy(textArea);
		expect(textArea.value).toBe('');
		fillInput(textArea, 'test 2');

		textArea.dispatchEvent(new FocusEvent('blur'));

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(123, 456));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(123, 456));

		// Both texts should be added.
		expect(getEditorText(editor)).toBe('test!\ntest 2');
	});
});
