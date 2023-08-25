import { BaseTool, InputEvtType, RenderingMode } from './lib';
import Editor from './Editor';
import createEditor from './testing/createEditor';

describe('Editor', () => {
	it('should fire keyup events when the editor loses focus', () => {
		const editor = createEditor();
		const rootElem = editor.getRootElement();

		const inputArea = rootElem.querySelector('textarea')! as HTMLTextAreaElement;

		// Set the only tool to a tool that reports which keys are pressed.
		const keyPressMock = jest.fn(() => true);
		const keyReleaseMock = jest.fn();
		editor.toolController.setTools([
			new (class extends BaseTool {
				public constructor() {
					super(editor.notifier, 'test');
				}

				public override onKeyPress = keyPressMock;
				public override onKeyUp = keyReleaseMock;
			})()
		]);

		inputArea.focus();

		// Sends a keyboard event to the editor
		const dispatchKeyEvent = (kind: 'keydown'|'keyup', code: string, key: string) => {
			const event = new KeyboardEvent(kind, {
				bubbles: true,
				key,
				code,
				shiftKey: false,
				ctrlKey: false,
				metaKey: false,
			});
			inputArea.dispatchEvent(event);
		};

		// Press the A key
		dispatchKeyEvent('keydown', 'KeyA', 'a');

		const keyAEvent = {
			kind: InputEvtType.KeyPressEvent,
			key: 'a',
			code: 'KeyA',
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
		};
		expect(keyPressMock).toHaveBeenLastCalledWith(keyAEvent);
		expect(keyPressMock).toHaveBeenCalledTimes(1);

		// Press it again
		dispatchKeyEvent('keydown', 'KeyA', 'a');

		expect(keyPressMock).toHaveBeenLastCalledWith(keyAEvent);
		expect(keyPressMock).toHaveBeenCalledTimes(2);

		// Pressing a different key should send a different keydownb event to the toolbar
		dispatchKeyEvent('keydown', 'KeyB', 'b');

		expect(keyPressMock).not.toHaveBeenLastCalledWith(keyAEvent);
		expect(keyPressMock).toHaveBeenCalledTimes(3);

		// Press yet another key (and multiple times) -- if this key is still down when the
		// editor is blured, a keyup event should only be fired once.
		dispatchKeyEvent('keydown', 'KeyF', 'f');
		expect(keyPressMock).toHaveBeenCalledTimes(4);

		dispatchKeyEvent('keydown', 'KeyF', 'f');
		expect(keyPressMock).toHaveBeenCalledTimes(5);

		dispatchKeyEvent('keyup', 'KeyA', 'a');
		expect(keyPressMock).toHaveBeenCalledTimes(5);
		expect(keyReleaseMock).toHaveBeenCalledTimes(1);
		expect(keyReleaseMock).toHaveBeenLastCalledWith({
			...keyAEvent,
			kind: InputEvtType.KeyUpEvent
		});

		// Defocus the input --- this should fire a key up event for the keys still down
		inputArea.blur();
		inputArea.dispatchEvent(new Event('blur', { bubbles: true }));

		const focusable = document.createElement('button');
		document.body.appendChild(focusable);
		focusable.focus();

		expect(keyReleaseMock).toHaveBeenCalledTimes(3);

		// Events for both keys that were still down should have been fired:
		const secondToLastCall = keyReleaseMock.mock.calls[keyReleaseMock.mock.calls.length - 2];
		const lastCall = keyReleaseMock.mock.lastCall;

		expect(secondToLastCall).toMatchObject([{
			kind: InputEvtType.KeyUpEvent,
			key: 'b',
			code: 'KeyB',
		}]);
		expect(lastCall).toMatchObject([{
			kind: InputEvtType.KeyUpEvent,
			key: 'f',
			code: 'KeyF',
		}]);
	});

	it('should throw if given minimum zoom greater than maximum zoom', () => {
		const makeEditorWithInvalidSettings = () => {
			return new Editor(document.body, {
				renderingMode: RenderingMode.DummyRenderer,

				minZoom: 10,
				maxZoom: 1,
			});
		};

		expect(makeEditorWithInvalidSettings).toThrow('Minimum zoom must be lesser');
	});


});
