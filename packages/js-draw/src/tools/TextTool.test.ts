import Editor from '../Editor';
import createEditor from '../testing/createEditor';
import sendPenEvent from '../testing/sendPenEvent';
import TextTool from './TextTool';
import { InputEvtType } from '../inputEvents';
import { Vec2 } from '@js-draw/math';
import fillInput from '../testing/fillHtmlInput';
import sendKeyPressRelease from '../testing/sendKeyPressRelease';
import { TextComponent } from '../lib';

const getTextTool = (editor: Editor) => {
	return editor.toolController.getMatchingTools(TextTool)[0];
};

const getTextEditor = (editor: Editor): HTMLTextAreaElement | null => {
	return editor.getRootElement().querySelector('.textEditorOverlay textarea');
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
		if (!textArea) throw new Error('Could not find the <textarea> element!');

		fillInput(textArea, 'test...');
		sendKeyPressRelease(textArea, 'Enter');

		const textComponents = editor.image
			.getAllElements()
			.filter((element) => element instanceof TextComponent);
		expect(textComponents).toHaveLength(1);

		expect(textComponents[0].getText()).toBe('test...');
	});
});
