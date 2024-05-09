import createEditor from '../testing/createEditor';
import TextTool from './TextTool';

describe('TextTool', () => {
	test.each([
		{ editorFontSetting: undefined },
		{ editorFontSetting: [ ] },
		{ editorFontSetting: [ 'foo' ] },
		{ editorFontSetting: [ 'foo', 'bar' ] },
		{ editorFontSetting: [ 'foo', 'bar', 'baz' ] },
	])('should use an editor built-in font, where available', ({ editorFontSetting }) => {
		const editor = createEditor({
			text: { fonts: editorFontSetting }
		});
		const textTool = editor.toolController.getMatchingTools(TextTool)[0];
		expect(textTool.getTextStyle().fontFamily).toBe(editorFontSetting?.[0] ?? 'sans-serif');
	});
});