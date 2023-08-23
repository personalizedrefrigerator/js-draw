import { Color4 } from '../lib';
import createEditor from '../testing/createEditor';
import adjustEditorThemeForContrast from './adjustEditorThemeForContrast';

describe('adjustEditorThemeForContrast', () => {
	it('should ensure that the selection background has sufficient contrast with the toolbar main background', () => {
		const editor = createEditor();
		const editorRoot = editor.getRootElement();
		editorRoot.style.setProperty('--background-color-2', '#90f072');
		editorRoot.style.setProperty('--selection-background-color', '#90f070');
		editorRoot.style.setProperty('--selection-foreground-color', '#90a080');

		const originalStyle = getComputedStyle(editor.getRootElement());
		const originalBG = Color4.fromString(originalStyle.getPropertyValue('--background-color-2'));
		const originalSelectionBG = Color4.fromString(originalStyle.getPropertyValue('--selection-background-color'));
		const originalSelectionFG = Color4.fromString(originalStyle.getPropertyValue('--selection-foreground-color'));

		expect(Color4.contrastRatio(originalBG, originalSelectionBG)).toBeLessThan(1.2);
		expect(Color4.contrastRatio(originalSelectionBG, originalSelectionFG)).toBeLessThan(2);

		// Because of the limitations of jsdom, we set the styles above directly on the editorRoot.style element.
		// Thus dontClearOverrides must be enabled.
		adjustEditorThemeForContrast(editor, { dontClearOverrides: true });

		const updatedBG = Color4.fromString(editorRoot.style.getPropertyValue('--background-color-2'));
		const updatedSelectionBG = Color4.fromString(editorRoot.style.getPropertyValue('--selection-background-color'));
		const updatedSelectionFG = Color4.fromString(editorRoot.style.getPropertyValue('--selection-foreground-color'));
		expect(Color4.contrastRatio(updatedBG, updatedSelectionBG)).toBeGreaterThan(1.2);
		expect(Color4.contrastRatio(updatedSelectionBG, updatedSelectionFG)).toBeGreaterThan(4.5);
	});
});