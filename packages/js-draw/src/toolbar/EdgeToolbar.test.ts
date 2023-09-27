import createEditor from '../testing/createEditor';
import { makeEdgeToolbar } from './EdgeToolbar';

describe('EdgeToolbar', () => {
	it('should add widgets when calling .addDefaults', () => {
		const editor = createEditor();
		const toolbar = makeEdgeToolbar(editor);

		// Before calling .addDefaults, the toolbar should exist, but have no
		// widgets.
		const editorRoot = editor.getRootElement();
		expect(editorRoot.querySelectorAll('.toolbar-edge-toolbar')).toHaveLength(1);
		expect(editorRoot.querySelectorAll('.toolbar-edge-toolbar .toolbar-button')).toHaveLength(0);

		toolbar.addDefaults();

		// After, should have widgets.
		expect(
			editorRoot.querySelectorAll('.toolbar-edge-toolbar .toolbar-button').length
		).toBeGreaterThan(0);
	});

	it('clicking on a tool button should open the associated menu', () => {
		const editor = createEditor();
		const toolbar = makeEdgeToolbar(editor);
		toolbar.addDefaultToolWidgets();

		const editorRoot = editor.getRootElement();
		const toolButtons = editorRoot.querySelectorAll('.toolbar-edge-toolbar .toolbar-button');
		const edgemenuContainer = editorRoot.querySelector('.toolbar-edgemenu-container')! as HTMLElement;

		expect(edgemenuContainer).toBeTruthy();
		expect(toolButtons.length).toBeGreaterThan(3);

		// Before clicking a button, the edgemenu container should have display set to none
		expect(getComputedStyle(edgemenuContainer).display).toBe('none');

		const firstButton = toolButtons[0] as HTMLElement;
		firstButton.click();

		// After clicking, should have non-none visibility
		expect(getComputedStyle(edgemenuContainer).display).not.toBe('none');
		expect(getComputedStyle(edgemenuContainer).opacity).not.toBe('0'); // Should be fading in

		// The focused button should close the toolbar when clicked (and be within the menu container).
		const closeButton = edgemenuContainer.querySelector(':focus')! as HTMLElement;
		expect(closeButton).toBeTruthy();

		closeButton.click();

		// The edge menu should be fading out.
		expect(getComputedStyle(edgemenuContainer).opacity).toBe('0');
	});
});
