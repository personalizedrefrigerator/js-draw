import createEditor from '../../testing/createEditor';
import { makeDropdownToolbar } from '../DropdownToolbar';
import { PenTool, Editor, BaseTool, InputEvtType, KeyPressEvent } from '../../lib';
import BaseToolWidget from './BaseToolWidget';

// BaseToolWidget is abstract so we need to extend it.
class TestToolWidget extends BaseToolWidget {
	public handleKeyPressMock = jest.fn();

	public constructor(editor: Editor, tool: BaseTool, id: string = 'test') {
		super(editor, tool, id);
	}

	public override getTitle() {
		return 'Test';
	}

	public override createIcon() {
		return null;
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		this.handleKeyPressMock(event);
		return super.onKeyPress(event);
	}

	// Exposes a protected method
	public getDropdownVisible() {
		return this.isDropdownVisible();
	}

	// Exposes a protected method
	public getIsSelected() {
		return this.isSelected();
	}

	protected override fillDropdown(dropdown: HTMLElement) {
		// Necessary for the dropdown to show
		dropdown.replaceChildren(document.createTextNode('Some content'));
		return true;
	}
}

describe('BaseToolWidget', () => {
	it('tool button should be selected if tool is enabled', () => {
		const editor = createEditor();
		const toolbar = makeDropdownToolbar(editor);

		const pen = editor.toolController.getMatchingTools(PenTool)[0];
		pen.setEnabled(false);

		// Tool is not enabled, so should not be selected
		const toolWidget1 = new TestToolWidget(editor, pen, 'test-widget-1');
		toolbar.addWidget(toolWidget1);
		expect(toolWidget1.getIsSelected()).toBe(false);

		// Enabling the pen should select the widget
		pen.setEnabled(true);
		expect(toolWidget1.getIsSelected()).toBe(true);

		toolWidget1.remove();

		// Adding a different button when the pen is selected should
		// cause the new button to be initially selected
		const toolWidget2 = new TestToolWidget(editor, pen, 'test-widget-2');
		toolbar.addWidget(toolWidget2);

		expect(toolWidget2.getIsSelected()).toBe(true);

		// Changing whether the pen is enabled should also change whether the
		// widget is selected
		pen.setEnabled(false);
		expect(toolWidget2.getIsSelected()).toBe(false);

		pen.setEnabled(false);
		expect(toolWidget2.getIsSelected()).toBe(false);

		pen.setEnabled(true);
		expect(toolWidget2.getIsSelected()).toBe(true);

		pen.setEnabled(false);
		expect(toolWidget2.getIsSelected()).toBe(false);
	});

	it('pressing space should toggle the tool dropdown', () => {
		const editor = createEditor();
		const toolbar = makeDropdownToolbar(editor);

		const pen = editor.toolController.getMatchingTools(PenTool)[0];
		pen.setEnabled(true);

		const toolWidget1 = new TestToolWidget(editor, pen, 'test-widget');

		const pressSpace = () => {
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, ' ');
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, ' ');
		};
		pressSpace();

		// Should not have a visible dropdown when not yet added to the toolbar
		expect(toolWidget1.getDropdownVisible()).toBe(false);

		// Should not have received the key event
		expect(toolWidget1.handleKeyPressMock).not.toHaveBeenCalled();

		// Pressing space *after adding* should toggle the dropdown
		toolbar.addWidget(toolWidget1);
		pressSpace();

		expect(toolWidget1.handleKeyPressMock).toHaveBeenCalled();
		expect(toolWidget1.getDropdownVisible()).toBe(true);

		// Pressing again should close the dropdown
		pressSpace();
		expect(toolWidget1.getDropdownVisible()).toBe(false);

		toolWidget1.remove();

		toolWidget1.handleKeyPressMock.mockReset();
		pressSpace();
		expect(toolWidget1.handleKeyPressMock).not.toHaveBeenCalled();
		expect(toolWidget1.getDropdownVisible()).toBe(false);

		//

		// After adding again, pressing space should still toggle
		// the dropdown
		toolbar.addWidget(toolWidget1);
		pressSpace();

		expect(toolWidget1.handleKeyPressMock).toHaveBeenCalled();
		expect(toolWidget1.getDropdownVisible()).toBe(true);
	});
});
