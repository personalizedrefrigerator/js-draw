/**
 * Handles notifying listeners of events.
 *
 * `EventKeyType` is used to distinguish events (e.g. a `ClickEvent` vs a `TouchEvent`)
 * while `EventMessageType` is the type of the data sent with an event (can be `void`).
 *
 * @example
 * ```
 * const dispatcher = new EventDispatcher<'event1'|'event2'|'event3', void>();
 * dispatcher.on('event1', () => {
 *   console.log('Event 1 triggered.');
 * });
 * dispatcher.dispatch('event1');
 * ```
 *
 * @packageDocumentation
 */

// Code shared with Joplin (js-draw was originally intended to be part of Joplin).

type Listener<Value> = (data: Value)=> void;
type CallbackHandler<EventType> = (data: EventType)=> void;
export interface DispatcherEventListener {
	remove: ()=>void;
}

// { @inheritDoc EventDispatcher! }
export default class EventDispatcher<EventKeyType extends string|symbol|number, EventMessageType> {
	private listeners: Partial<Record<EventKeyType, Array<Listener<EventMessageType>>>>;
	public constructor() {
		this.listeners = {};
	}

	public dispatch(eventName: EventKeyType, event: EventMessageType) {
		const listenerList = this.listeners[eventName];

		if (listenerList) {
			for (let i = 0; i < listenerList.length; i++) {
				listenerList[i](event);
			}
		}
	}

	public on(eventName: EventKeyType, callback: CallbackHandler<EventMessageType>): DispatcherEventListener {
		if (!this.listeners[eventName]) this.listeners[eventName] = [];
		this.listeners[eventName]!.push(callback);

		return {
			// Retuns false if the listener has already been removed, true otherwise.
			remove: (): boolean => {
				const originalListeners = this.listeners[eventName]!;
				this.off(eventName, callback);

				return originalListeners.length !== this.listeners[eventName]!.length;
			},
		};
	}

	/** Removes an event listener. This is equivalent to calling `.remove()` on the object returned by `.on`. */
	public off(eventName: EventKeyType, callback: CallbackHandler<EventMessageType>) {
		const listeners = this.listeners[eventName];
		if (!listeners) return;

		// Replace the current list of listeners with a new, shortened list.
		// This allows any iterators over this.listeners to continue iterating
		// without skipping elements.
		this.listeners[eventName] = listeners.filter(
			otherCallback => otherCallback !== callback
		);
	}
}
