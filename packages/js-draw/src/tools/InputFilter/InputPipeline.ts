import { InputEvt } from '../../inputEvents';
import InputMapper from './InputMapper';

/**
 * The composition of multiple `InputMapper`s.
 */
export default class InputPipeline extends InputMapper {
	#head: InputMapper|null = null;
	#tail: InputMapper|null = null;

	public override onEvent(event: InputEvt): boolean {
		if (this.#head === null) {
			return this.emit(event);
		} else {
			return this.#head.onEvent(event);
		}
	}

	/**
	 * Adds a new `InputMapper` to the *tail* of this pipeline.
	 * Note that an instance of an `InputMapper` can only be used in a single
	 * pipeline.
	 */
	public addToTail(mapper: InputMapper) {
		if (!this.#tail) {
			this.#head = mapper;
			this.#tail = this.#head;
		} else {
			this.#tail.setEmitListener(mapper);
			this.#tail = mapper;
		}
		this.#tail.setEmitListener(event => this.emit(event));
	}
}