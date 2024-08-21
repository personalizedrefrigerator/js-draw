import Editor from '../Editor';
import { Point2 } from '@js-draw/math';
import Pointer, { PointerDevice } from '../Pointer';
import { InputEvtType, PointerEvtType } from '../inputEvents';
import getUniquePointerId from './getUniquePointerId';

/**
 * Dispatch a pen event to the currently selected tool.
 * Intended for unit tests.
 *
 * @see {@link sendTouchEvent}
 */
const sendPenEvent = (
	editor: Editor,
	eventType: PointerEvtType,
	point: Point2,

	allPointers?: Pointer[],

	deviceType: PointerDevice = PointerDevice.Pen,
) => {
	const id = getUniquePointerId(allPointers ?? []);

	const mainPointer = Pointer.ofCanvasPoint(
		point, eventType !== InputEvtType.PointerUpEvt, editor.viewport, id, deviceType,
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