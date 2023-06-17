import Editor from '../Editor';
import { Vec2 } from '../math/Vec2';
import Pointer, { PointerDevice } from '../Pointer';
import { InputEvtType } from '../types';

/**
 * Dispatch a touch event to the currently selected tool. Intended for unit tests.
 *
 * @see {@link sendPenEvent}
 *
 * @example
 * **Simulating a horizontal swipe gesture:**
 * ```ts
 * sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
 * for (let i = 1; i <= 10; i++) {
 *   jest.advanceTimersByTime(10);
 *   sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(i * 10, 0));
 * }
 * ```
 *
 * @example
 * **Simulating a pinch gesture.** This example assumes that you're using [Jest with timer mocks enabled](https://jestjs.io/docs/timer-mocks).
 * ```ts
 * let firstPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
 * let secondPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(100, 0), [ firstPointer ]);
 *
 * // Simulate a pinch
 * const maxIterations = 10;
 * for (let i = 0; i < maxIterations; i++) {
 *   // Use the unit testing framework's tool for increasing the current time
 *   // returned by (new Date()).getTime(), etc.
 *   jest.advanceTimersByTime(100);
 *
 *   const point1 = Vec2.of(-i * 5, 0);
 *   const point2 = Vec2.of(i * 5 + 100, 0);
 *
 *   firstPointer = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, point1, [ secondPointer ]);
 *   secondPointer = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, point2, [ firstPointer ]);
 * }
 * ```
 */
const sendTouchEvent = (
	editor: Editor,
	eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
	screenPos: Vec2,
	allOtherPointers?: Pointer[]
) => {
	const canvasPos = editor.viewport.screenToCanvas(screenPos);

	let ptrId = 0;
	let maxPtrId = 0;

	// Get a unique ID for the main pointer
	// (try to use id=0, but don't use it if it's already in use).
	for (const pointer of allOtherPointers ?? []) {
		maxPtrId = Math.max(pointer.id, maxPtrId);
		if (pointer.id === ptrId) {
			ptrId = maxPtrId + 1;
		}
	}

	const mainPointer = Pointer.ofCanvasPoint(
		canvasPos, eventType !== InputEvtType.PointerUpEvt, editor.viewport, ptrId, PointerDevice.Touch
	);

	editor.toolController.dispatchInputEvent({
		kind: eventType,
		allPointers: [
			...(allOtherPointers ?? []),
			mainPointer,
		],
		current: mainPointer,
	});

	return mainPointer;
};

export default sendTouchEvent;