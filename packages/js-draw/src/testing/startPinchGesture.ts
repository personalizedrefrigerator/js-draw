import type Editor from '../Editor';
import { Mat33, Point2, Vec2 } from '@js-draw/math';
import sendTouchEvent from './sendTouchEvent';
import { InputEvtType } from '../inputEvents';

/**
 * Creates two pointers and sends the touch {@link InputEvtType.PointerDownEvt}s for them.
 *
 * Returns an object that allows continuing or ending the gesture.
 *
 * `initialRotation` should be in radians.
 */
const startPinchGesture = (
	editor: Editor, center: Point2, initialDistance: number, initialRotation: number
) => {
	const computeTouchPoints = (center: Point2, distance: number, rotation: number) => {
		const halfDisplacement = Mat33.zRotation(rotation).transformVec2(Vec2.of(0, distance / 2));
		const point1 = center.plus(halfDisplacement);
		const point2 = center.minus(halfDisplacement);

		return [ point1, point2 ];
	};

	let [ touchPoint1, touchPoint2 ] = computeTouchPoints(center, initialDistance, initialRotation);
	let firstPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, touchPoint1);
	let secondPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, touchPoint2, [ firstPointer ]);

	return {
		update(center: Point2, distance: number, rotation: number) {
			const eventType = InputEvtType.PointerMoveEvt;

			const [ newPoint1, newPoint2 ] = computeTouchPoints(center, distance, rotation);
			touchPoint1 = newPoint1;
			touchPoint2 = newPoint2;

			firstPointer = sendTouchEvent(editor, eventType, newPoint1, [ secondPointer ]);
			secondPointer = sendTouchEvent(editor, eventType, newPoint2, [ firstPointer ]);
		},
		end() {
			sendTouchEvent(editor, InputEvtType.PointerUpEvt, touchPoint1, [ secondPointer ]);
			sendTouchEvent(editor, InputEvtType.PointerUpEvt, touchPoint2);
		},
	};
};

export default startPinchGesture;
