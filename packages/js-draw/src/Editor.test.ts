import { BackgroundComponent, BaseTool, InputEvtType, RenderingMode, SelectionTool, sendPenEvent } from './lib';
import { Color4, Point2, Vec2 } from '@js-draw/math';
import Editor from './Editor';
import createEditor from './testing/createEditor';
import { BackgroundType } from './components/BackgroundComponent';

describe('Editor', () => {
	it('should fire keyup events when the editor loses focus', () => {
		const editor = createEditor();
		const rootElem = editor.getRootElement();

		const inputArea = rootElem.querySelector('textarea')!;

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

	it('should not allow zooming out further than the minimum zoom', () => {
		const editor = new Editor(document.body, {
			renderingMode: RenderingMode.DummyRenderer,

			minZoom: 0.25,
			maxZoom: 2,
		});

		for (let i = 0; i < 10; i++) {
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 's');
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 's');
		}

		// Should be close-ish to the minimum, but not less than.
		expect(editor.viewport.getScaleFactor()).toBeGreaterThanOrEqual(0.25);
		expect(editor.viewport.getScaleFactor()).toBeLessThan(0.5);
	});

	it('should be read-only when in read-only mode', () => {
		const editor = createEditor();

		expect(editor.image.getAllElements()).toHaveLength(0);

		const drawStroke = () => {
			// Before setting read only, should be possible to draw.
			sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(20, 20));
			sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(30, 30));
		};

		drawStroke();
		expect(editor.image.getAllElements()).toHaveLength(1);

		editor.setReadOnly(true);

		const undoWithKeyboard = () => {
			// Try to undo with keyboard shortcuts
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'z', true);
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'z', true);
		};

		undoWithKeyboard();

		// Should have no effect
		expect(editor.image.getAllElements()).toHaveLength(1);

		// Try to draw
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(-100, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(20, 0));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(30, 300));

		// Should have no effect
		expect(editor.image.getAllElements()).toHaveLength(1);

		// Try to select and delete everything
		const selectAndDeleteAll = () => {
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'a', true);
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'a', true);

			// Should select regardless of whether enabled.
			const selectedObjects = [];
			for (const selectionTool of editor.toolController.getMatchingTools(SelectionTool)) {
				selectedObjects.push(...selectionTool.getSelectedObjects());
			}
			expect(selectedObjects).toHaveLength(1);

			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'Delete', false);
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'Delete', false);
		};
		selectAndDeleteAll();

		// Should have no effect
		expect(editor.image.getAllElements()).toHaveLength(1);

		editor.setReadOnly(false);

		// Try to re-enable the pen tool
		const selectFirstTool = () => {
			editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, '1', false);
			editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, '1', false);
		};
		selectFirstTool();

		// Now try to delete everything
		selectAndDeleteAll();

		// Should work
		expect(editor.image.getAllElements()).toHaveLength(0);

		// Undoing with keyboard shortcuts should also work
		undoWithKeyboard();
		expect(editor.image.getAllElements()).toHaveLength(1);

		// And so should drawing
		selectFirstTool();
		drawStroke();
		expect(editor.image.getAllElements()).toHaveLength(2);
	});

	it('handlePointerEventsExceptClicksFrom should not consider a large circle a click', async () => {
		const editor = createEditor();
		expect(editor.image.getAllElements()).toHaveLength(0);

		const testElement = document.createElement('div');
		const eventHandler = editor.handlePointerEventsExceptClicksFrom(testElement);

		const dispatchEventAt = (eventName: 'pointerdown'|'pointermove'|'pointerup', pos: Point2) => {
			testElement.dispatchEvent(new PointerEvent(eventName, {
				clientX: pos.x,
				clientY: pos.y,
				screenX: pos.x,
				screenY: pos.y,
				pointerId: 0,
				pointerType: 'mouse',
				isPrimary: true,
			}));
		};

		// An actual click
		dispatchEventAt('pointerdown', Vec2.of(100, 0));
		await jest.advanceTimersByTimeAsync(10);
		dispatchEventAt('pointermove', Vec2.of(100.01, 0.01));
		await jest.advanceTimersByTimeAsync(10);
		dispatchEventAt('pointerup', Vec2.of(100.01, 0.01));
		await jest.advanceTimersByTimeAsync(10);

		// Should not have handled a click
		expect(editor.image.getAllElements()).toHaveLength(0);

		// Should allow drawing a circle
		const circleRadius = 200;
		dispatchEventAt('pointerdown', Vec2.of(circleRadius, 0));

		const maxSteps = 10;
		for (let i = 0; i <= maxSteps; i += 1) {
			await jest.advanceTimersByTimeAsync(10);

			const angle = i / maxSteps * Math.PI * 2;
			const circlePoint = Vec2.of(Math.cos(angle) * circleRadius, Math.sin(angle) * circleRadius);
			dispatchEventAt('pointermove', circlePoint);
		}

		dispatchEventAt('pointermove', Vec2.of(circleRadius, 0));
		dispatchEventAt('pointerup', Vec2.of(circleRadius, 0));
		await jest.advanceTimersByTimeAsync(10);

		expect(editor.image.getAllElements()).toHaveLength(1);

		eventHandler.remove();
	});

	describe('.setBackgroundStyle', () => {
		it.each([
			{
				style: { color: Color4.red },
				expectedStyle: { color: Color4.red, type: BackgroundType.SolidColor, autoresize: false },
				expectedBackgroundCount: 1,
			},
			{
				style: { type: BackgroundType.None },
				expectedStyle: { autoresize: false },
				expectedBackgroundCount: 0,
			},
			{
				style: { type: BackgroundType.None, autoresize: true },
				expectedStyle: { autoresize: true },
				expectedBackgroundCount: 0,
			},
			{
				style: { type: BackgroundType.Grid, autoresize: true },
				expectedStyle: { color: Color4.transparent, type: BackgroundType.Grid, autoresize: true },
				expectedBackgroundCount: 1,
			},
		])('should support setting the background style of an image with no default background (style: %j)',
			async ({ style, expectedBackgroundCount, expectedStyle }) => {
				const editor = createEditor();
				expect(editor.estimateBackgroundColor()).objEq(Color4.transparent);

				editor.dispatch(editor.setBackgroundStyle(style));

				expect(editor.image.getAutoresizeEnabled()).toBe(expectedStyle.autoresize);

				expect(editor.image.getBackgroundComponents()).toHaveLength(expectedBackgroundCount);
				if (expectedBackgroundCount > 0) {
					const background = editor.image.getBackgroundComponents()[0] as BackgroundComponent;
					expect(background.getStyle().color).objEq(expectedStyle.color ?? Color4.transparent);
					expect(background.getBackgroundType()).toBe(expectedStyle.type);
				}

				// Should also be possible to remove a background with .setBackgroundStyle
				editor.dispatch(editor.setBackgroundStyle({ type: BackgroundType.None }));
				expect(editor.image.getBackgroundComponents()).toHaveLength(0);
			}
		);

		it('setting autoresize: false on an empty image should not result in a 0x0 background', async () => {
			const editor = createEditor();
			expect(editor.estimateBackgroundColor()).objEq(Color4.transparent);

			editor.dispatch(editor.setBackgroundStyle({ autoresize: true }));
			expect(editor.image.getAutoresizeEnabled()).toBe(true);
			editor.dispatch(editor.setBackgroundStyle({ autoresize: false }));

			expect(editor.image.getAutoresizeEnabled()).toBe(false);
			expect(editor.image.getImportExportRect().minDimension).toBeGreaterThan(10);
			expect(editor.image.getImportExportRect().minDimension).toBeLessThan(1000);
		});
	});
});
