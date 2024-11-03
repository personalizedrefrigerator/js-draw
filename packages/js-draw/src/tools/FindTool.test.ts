import { InputEvtType } from '../inputEvents';
import TextComponent from '../components/TextComponent';
import { Mat33, Color4 } from '@js-draw/math';
import createEditor from '../testing/createEditor';
import FindTool from './FindTool';

describe('FindTool', () => {
	it('should open/close on ctrl+f', () => {
		const editor = createEditor();
		const findTool = editor.toolController.getMatchingTools(FindTool)[0];
		expect(findTool).not.toBeFalsy();

		const overlay = editor.getRootElement().querySelector('.find-tool-overlay')!;

		expect(getComputedStyle(overlay).display).toBe('none');
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'f', true);

		expect(getComputedStyle(overlay).display).not.toBe('none');

		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'f', true);
		expect(getComputedStyle(overlay).display).toBe('none');
	});

	it('should navigate to the next match on pressing enter', () => {
		const editor = createEditor();
		const findTool = editor.toolController.getMatchingTools(FindTool)[0];
		expect(findTool).not.toBeFalsy();

		// Reset the viewport
		editor.viewport.resetTransform();
		expect(editor.viewport.getScaleFactor()).toBeCloseTo(1);

		// Show the find tool
		const overlay = editor.getRootElement().querySelector('.find-tool-overlay')!;
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'f', true);
		expect(getComputedStyle(overlay).display).not.toBe('none');

		// Add some text to the image
		const style = { size: 12, fontFamily: 'serif', renderingStyle: { fill: Color4.red } };
		const text = TextComponent.fromLines(['test'], Mat33.scaling2D(0.01), style);
		void editor.image.addElement(text).apply(editor);

		// Should focus the search input
		const searchInput = document.querySelector(':focus')!;
		expect(searchInput).not.toBeFalsy();
		expect(searchInput.tagName).toBe('INPUT');

		// Should not change the view when searching for something that doesn't exist.
		searchInput.setAttribute('value', 'testing');
		searchInput.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				code: 'Enter',
			}),
		);
		expect(editor.viewport.getScaleFactor()).toBeCloseTo(1);

		// Search input should still have focus
		expect(document.querySelector(':focus')).toBe(searchInput);

		// When searching for a substring that does exist, should zoom.
		searchInput.setAttribute('value', 'test');
		searchInput.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				code: 'Enter',
			}),
		);
		expect(editor.viewport.getScaleFactor()).not.toBeCloseTo(1);
	});
});
