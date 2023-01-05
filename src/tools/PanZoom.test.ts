
import Editor from '../Editor';
import { Mat33, Pointer, PointerDevice, Vec2 } from '../lib';
import createEditor from '../testing/createEditor';
import { InputEvtType } from '../types';
import waitForTimeout from '../util/waitForTimeout';
import PanZoom from './PanZoom';

const selectPanZom = (editor: Editor): PanZoom => {
	const primaryTools = editor.toolController.getPrimaryTools();
	const panZoom = primaryTools.filter(tool => tool instanceof PanZoom)[0] as PanZoom;
	panZoom.setEnabled(true);
	return panZoom;
};

const sendTouchEvent = (
	editor: Editor,
	eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
	screenPos: Vec2,
) => {
	const canvasPos = editor.viewport.screenToCanvas(screenPos);

	const ptrId = 0;
	const mainPointer = Pointer.ofCanvasPoint(
		canvasPos, eventType !== InputEvtType.PointerUpEvt, editor.viewport, ptrId, PointerDevice.Touch
	);

	editor.toolController.dispatchInputEvent({
		kind: eventType,
		allPointers: [
			mainPointer,
		],
		current: mainPointer,
	});
};

describe('PanZoom', () => {
	it('touch and drag should pan, then inertial scroll', async () => {
		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(Mat33.identity);

		const origTranslation = editor.viewport.canvasToScreen(Vec2.zero);

		sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		for (let i = 1; i <= 10; i++) {
			jest.advanceTimersByTime(10);
			sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(i * 10, 0));
		}

		// Use real timers -- we need to be able to start the inertial scroller.
		jest.useRealTimers();
		sendTouchEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 0));

		const updatedTranslation = editor.viewport.canvasToScreen(Vec2.zero);
		expect(updatedTranslation.minus(origTranslation).magnitude()).toBe(100);

		await waitForTimeout(600); // ms
		jest.useFakeTimers();

		// Should inertial scroll
		const afterDelayTranslation = editor.viewport.canvasToScreen(Vec2.zero);
		expect(afterDelayTranslation.minus(updatedTranslation).magnitude()).toBeGreaterThan(0);
	});
});
