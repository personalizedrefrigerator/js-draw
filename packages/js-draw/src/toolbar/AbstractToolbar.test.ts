import createEditor from '../testing/createEditor';
import { makeDropdownToolbar } from './DropdownToolbar';
import { makeEdgeToolbar } from './EdgeToolbar';

const toolbarConstructors = [ makeDropdownToolbar, makeEdgeToolbar ];

describe('AbstractToolbar', () => {
	it('should allow overriding labels and icons of save and exit buttons', () => {
		const editor = createEditor();
		const editorElement = editor.getRootElement();

		for (const makeToolbar of toolbarConstructors) {
			const toolbar = makeToolbar(editor);

			expect(editorElement.querySelectorAll('.toolwidget-tag--exit')).toHaveLength(0);
			expect(editorElement.querySelectorAll('.toolwidget-tag--save')).toHaveLength(0);

			// Just override the label
			const exitCallback = jest.fn();
			toolbar.addExitButton(exitCallback, {
				label: 'Foo',
			});

			expect(editorElement.querySelectorAll('.toolwidget-tag--exit')).toHaveLength(1);

			// Should have correct label
			const firstExitButton = editorElement.querySelector('.toolwidget-tag--exit')!;
			expect(firstExitButton.querySelector('label')!.innerText).toBe('Foo');

			// Should also work with save
			const saveCallback = jest.fn();
			toolbar.addSaveButton(saveCallback, {
				label: 'Test Save',
			});

			expect(editorElement.querySelectorAll('.toolwidget-tag--save')).toHaveLength(1);
			const firstSaveButton = editorElement.querySelector('.toolwidget-tag--save')!;
			expect(firstSaveButton.querySelector('label')!.innerText).toBe('Test Save');

			// Calling addSaveButton again should create a new save button
			toolbar.addSaveButton(saveCallback, {
				label: 'Test Save 2',
				icon: document.createElement('details'),
			});
			expect(editorElement.querySelectorAll('.toolwidget-tag--save')).toHaveLength(2);

			const saveButton2 = editorElement.querySelectorAll('.toolwidget-tag--save')[1];
			expect(saveButton2.querySelector('label')!.innerText).toBe('Test Save 2');
			expect(saveButton2.querySelector('details')).toBeTruthy();

			// Clean up for the next toolbar
			toolbar.remove();
		}
	});
});
