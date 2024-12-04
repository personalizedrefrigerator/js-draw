import Editor from '../Editor';
import createEditor from '../testing/createEditor';
import sendPenEvent from '../testing/sendPenEvent';
import TextTool from './TextTool';
import { InputEvtType } from '../inputEvents';
import { Vec2 } from '@js-draw/math';

const getTextTool = (editor: Editor) => {
	return editor.toolController.getMatchingTools(TextTool)[0];
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
		const getTextEditor = () => {
			return editor.getRootElement().querySelector('.textEditorOverlay textarea');
		};
		expect(getTextEditor()).toBeFalsy();

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.zero);

		expect(getTextEditor()).toBeTruthy();
	});
});
