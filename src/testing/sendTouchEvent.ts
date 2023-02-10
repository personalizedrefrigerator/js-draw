import Editor from '../Editor';
import { Vec2 } from '../math/Vec2';
import Pointer, { PointerDevice } from '../Pointer';
import { InputEvtType } from '../types';


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