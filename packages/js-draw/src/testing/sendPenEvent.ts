import Editor from '../Editor';
import { Point2 } from '../math/Vec2';
import Pointer from '../Pointer';
import { InputEvtType } from '../inputEvents';
import getUniquePointerId from './getUniquePointerId';

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
	const id = getUniquePointerId(allPointers ?? []);

	const mainPointer = Pointer.ofCanvasPoint(
		point, eventType !== InputEvtType.PointerUpEvt, editor.viewport, id
	);

	editor.toolController.dispatchInputEvent({
		kind: eventType,
		allPointers: allPointers ?? [
			mainPointer,
		],
		current: mainPointer,
	});

	return mainPointer;
};
export default sendPenEvent;