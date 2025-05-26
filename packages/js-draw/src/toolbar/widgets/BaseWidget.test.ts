import { Editor, InputEvtType, KeyPressEvent } from '../../lib';
import createEditor from '../../testing/createEditor';
import { makeEdgeToolbar } from '../EdgeToolbar';
import BaseWidget from './BaseWidget';

class TestWidget extends BaseWidget {
	public clickMock = jest.fn();
	public keyPressMock = jest.fn();

	public constructor(editor: Editor, id: string) {
		super(editor, id);
	}

	protected override getTitle(): string {
		return 'Test widget subclass';
	}

	protected override createIcon() {
		return null;
	}

	protected override handleClick(): void {
		this.clickMock();
	}

	public keyPressStopsPropagation = true;

	protected override onKeyPress(event: KeyPressEvent): boolean {
		this.keyPressMock(event);

		// To stop propagation, returns true
		return this.keyPressStopsPropagation;
	}
}

describe('BaseWidget', () => {
	it('should not call onKeyPress method when not in the toolbar', () => {
		const editor = createEditor();
		const toolbar = makeEdgeToolbar(editor);

		const testWidget1 = new TestWidget(editor, 'test-widget-1');
		const testWidget2 = new TestWidget(editor, 'test-widget-2');
		toolbar.addWidget(testWidget1);
		toolbar.addWidget(testWidget2);

		const pressAndReleaseKey = (key: string) => {
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, key);
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, key);
		};

		expect(testWidget1.keyPressMock).not.toHaveBeenCalled();
		expect(testWidget2.keyPressMock).not.toHaveBeenCalled();

		// Don't send key events to other widgets after intercepting
		testWidget1.keyPressStopsPropagation = true;
		testWidget2.keyPressStopsPropagation = true;

		pressAndReleaseKey('p');

		// Should only fire the first widget's listener
		expect(testWidget1.keyPressMock).toHaveBeenCalledTimes(1);
		expect(testWidget2.keyPressMock).toHaveBeenCalledTimes(0);

		// Removing the first widget should allow the second widget
		// to receive events
		testWidget1.remove();

		pressAndReleaseKey('p');
		expect(testWidget1.keyPressMock).toHaveBeenCalledTimes(1);
		expect(testWidget2.keyPressMock).toHaveBeenCalledTimes(1);

		// Removing widget 2 and adding widget 1 should allow widget 1
		// to receive events again.
		toolbar.addWidget(testWidget1);
		testWidget2.remove();

		pressAndReleaseKey('p');
		expect(testWidget1.keyPressMock).toHaveBeenCalledTimes(2);
		expect(testWidget2.keyPressMock).toHaveBeenCalledTimes(1);
	});
});
