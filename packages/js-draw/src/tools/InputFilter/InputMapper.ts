import { InputEvt } from '../../inputEvents';

type OnEventCallback = (event: InputEvt) => boolean;

export interface InputEventListener {
	// Returns true if handled
	onEvent: OnEventCallback;
}

/**
 * Accepts input events and emits input events.
 */
export default abstract class InputMapper implements InputEventListener {
	#listener: OnEventCallback | null = null;

	public constructor() {}

	// @internal
	public setEmitListener(listener: InputEventListener | OnEventCallback | null) {
		if (listener && typeof listener === 'object') {
			this.#listener = (event) => {
				return listener.onEvent(event) ?? false;
			};
		} else {
			this.#listener = listener;
		}
	}

	protected emit(event: InputEvt): boolean {
		return this.#listener?.(event) ?? false;
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
