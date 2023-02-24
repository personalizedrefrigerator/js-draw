import Editor from '../Editor';
import { Point2 } from '../math/Vec2';
import Pointer from '../Pointer';
import { InputEvtType } from '../types';

/**
 * Dispatch a pen event to the currently selected tool.
 * Intended for unit tests.
 * 
 * @see {@link sendTouchEvent}
 */
const sendPenEvent = (
	editor: Editor,
	eventType: InputEvtType.PointerDownEvt|InputEvtType.PointerMoveEvt|InputEvtType.PointerUpEvt,
	point: Point2,

	allPointers?: Pointer[]
) => {
	const mainPointer = Pointer.ofCanvasPoint(
		point, eventType !== InputEvtType.PointerUpEvt, editor.viewport
	);

	editor.toolController.dispatchInputEvent({
		kind: eventType,
		allPointers: allPointers ?? [
			mainPointer,
		],
		current: mainPointer,
	});
};
export default sendPenEvent;