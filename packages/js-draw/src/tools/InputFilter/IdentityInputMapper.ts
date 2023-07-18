import { InputEvt } from 'js-draw/src/types';
import InputMapper from './InputMapper';

/**
 * An `InputMapper` that sends its input to the next mapper in the pipeline.
 */
export default class IdentityInputMapper extends InputMapper {
	public override onEvent(event: InputEvt): boolean {
		return this.emit(event);
	}
}