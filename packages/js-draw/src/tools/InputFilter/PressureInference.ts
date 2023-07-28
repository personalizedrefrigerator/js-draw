import InputMapper from './InputMapper';
import { InputEvt, InputEvtType, isPointerEvt } from '../../inputEvents';
import Pointer from '../../Pointer';
import { Vec2 } from '../../math/Vec2';

export default class PressureInference extends InputMapper {
	private lastPointerData: Record<number, Pointer> = {};

	public constructor() {
		super();
	}

	public override onEvent(event: InputEvt): boolean {
		if (isPointerEvt(event)) {
			let pressure = event.current.pressure ?? 0.5;

			if (event.kind !== InputEvtType.PointerDownEvt) {
				const lastData = this.lastPointerData[event.current.id];

				if (lastData) {
					const deltaTime = event.current.timeStamp - lastData.timeStamp;
					const velocity = event.current.screenPos.minus(lastData.screenPos).times(1/deltaTime);
					const deltaPressure = (event.current.pressure ?? 0) - (lastData.pressure ?? 0);

					if (deltaPressure === 0) {
						// Guess the pressure based on velocity
						pressure = -Math.atan(velocity.dot(Vec2.of(1, 1)) * 4) / Math.PI + 0.5;
					}
				}
			}

			this.lastPointerData[event.current.id] = event.current;
			const mappedCurrent = event.current.withPressure(pressure);

			return this.emit({
				...event,
				current: mappedCurrent,
				allPointers: event.allPointers.map(ptr => ptr === event.current ? mappedCurrent : ptr),
			});
		}

		return this.emit(event);
	}
}