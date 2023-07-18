import { InputEvt } from '../../types';

export interface InputEventListener {
	// Returns true if handled
	onEvent(event: InputEvt): boolean;
}

/**
 * Accepts input events and emits input events.
 */
export default abstract class InputMapper implements InputEventListener {
	#listener: InputEventListener|null;

	public constructor(listener: InputEventListener|null) {
		this.#listener = listener;
	}

	// @internal
	public setEmitListener(listener: InputEventListener|null) {
		this.#listener = listener;
	}

	protected emit(event: InputEvt): boolean {
		return this.#listener?.onEvent(event) ?? false;
	}

	/**
	 * @returns true if the given `event` should be considered "handled" by the app and thus not
	 * forwarded to other targets. For example, returning "true" for a touchpad pinch event prevents
	 * the pinch event from zooming the webpage.
	 *
	 * Generally, this should return the result of calling `this.emit` with some event.
	 */
	public abstract onEvent(event: InputEvt): boolean;
}
