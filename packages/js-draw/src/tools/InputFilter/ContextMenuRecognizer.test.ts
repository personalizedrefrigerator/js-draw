import { Vec2 } from '@js-draw/math';
import { InputEvtType, PointerEvt, PointerEvtType } from '../../inputEvents';
import Pointer, { PointerDevice } from '../../Pointer';
import ContextMenuRecognizer from './ContextMenuRecognizer';
import InputPipeline from './InputPipeline';
import Viewport from '../../Viewport';

const createPointerEvent = (
	kind: PointerEvtType,
	id: number,
	device: PointerDevice,
): PointerEvt => {
	const down = kind !== InputEvtType.PointerUpEvt;
	const pointer = Pointer.ofCanvasPoint(Vec2.zero, down, new Viewport(() => {}), id, device);
	return {
		kind,
		current: pointer,
		allPointers: pointer.down ? [pointer] : [],
	};
};

const setUpPipeline = () => {
	const pipeline = new InputPipeline();
	const mapper = new ContextMenuRecognizer();
	pipeline.addToTail(mapper);

	const emitListener = jest.fn();
	pipeline.setEmitListener(emitListener);

	return {
		pipeline,
		emitListener,
		getAllEventTypes: (): InputEvtType[] => {
			return emitListener.mock.calls.map((args): InputEvtType => args[0]?.kind);
		},
	};
};

describe('ContextMenuRecognizer', () => {
	test('should send contextmenu events for right-clicks', () => {
		const { pipeline, getAllEventTypes } = setUpPipeline();

		pipeline.onEvent(
			createPointerEvent(InputEvtType.PointerDownEvt, 0, PointerDevice.RightButtonMouse),
		);

		expect(getAllEventTypes()).not.toContain(InputEvtType.ContextMenu);

		pipeline.onEvent(
			createPointerEvent(InputEvtType.PointerUpEvt, 0, PointerDevice.RightButtonMouse),
		);

		expect(getAllEventTypes()).toContain(InputEvtType.ContextMenu);
	});

	test.each([
		[PointerDevice.Touch, true],
		[PointerDevice.PrimaryButtonMouse, false],
	])(
		'should detect long-press touch events as contextmenu events (case %#)',
		async (device, shouldSendMenuEvent) => {
			const { pipeline, getAllEventTypes } = setUpPipeline();

			pipeline.onEvent(createPointerEvent(InputEvtType.PointerDownEvt, 0, device));

			expect(getAllEventTypes()).not.toContain(InputEvtType.ContextMenu);

			await jest.advanceTimersByTimeAsync(200);

			pipeline.onEvent(createPointerEvent(InputEvtType.PointerMoveEvt, 0, device));

			await jest.advanceTimersByTimeAsync(2000);

			pipeline.onEvent(createPointerEvent(InputEvtType.PointerUpEvt, 0, device));

			expect(getAllEventTypes().includes(InputEvtType.ContextMenu)).toBe(shouldSendMenuEvent);
		},
	);
});
