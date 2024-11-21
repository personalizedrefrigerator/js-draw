import { makeEdgeToolbar } from '../EdgeToolbar';
import TextToolWidget from './TextToolWidget';
import createEditor from '../../testing/createEditor';
import { TextTool } from '../../lib';
import sendKeyPressRelease from '../../testing/sendKeyPressRelease';

describe('TextToolWidget', () => {
	test.each([[['sans', 'sans-serif', 'somefont']], [['free mono']]])(
		'should use the list of fonts provided to the Editor constructor',
		async (fonts) => {
			const editor = createEditor({
				text: { fonts },
			});
			const toolbar = makeEdgeToolbar(editor);

			const textTool = editor.toolController.getMatchingTools(TextTool)[0];
			textTool.setEnabled(true);

			const textWidget = new TextToolWidget(editor, textTool);
			toolbar.addWidget(textWidget);

			const pressSpace = () => sendKeyPressRelease(editor, ' ');
			pressSpace();

			const fontSelectors = editor.getRootElement().querySelectorAll('.font-selector');
			expect(fontSelectors).toHaveLength(1);

			const itemValues = [...fontSelectors[0].querySelectorAll('option')].map((item) => item.value);
			expect(itemValues).toMatchObject(fonts);
		},
	);
});
