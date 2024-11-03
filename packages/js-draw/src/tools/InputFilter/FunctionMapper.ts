import { InputEvt } from '../../inputEvents';
import InputMapper from './InputMapper';

/**
 * An `InputMapper` that applies a function to all events it receives.
 *
 * Useful for automated testing.
 */
export default class FunctionMapper extends InputMapper {
	public constructor(private fn: (event: InputEvt) => InputEvt) {
		super();
	}

	public override onEvent(event: InputEvt): boolean {
		return this.emit(this.fn(event));
	}
}
