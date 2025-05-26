type ListenerResult = { remove(): void };
type UpdateCallback<T> = (value: T) => void;

const noOpUpdateListenerResult = {
	remove() {},
};

/**
 * An update listener that does nothing. Useful for reactive values
 * that will never change.
 */
const noOpSetUpdateListener = () => {
	return noOpUpdateListenerResult;
};

type ReactiveValuesOf<T extends unknown[]> = {
	[key in keyof T]: ReactiveValue<T[key]>;
};

/**
 * A `ReactiveValue` is a value that
 * - updates periodically,
 * - can fire listeners when it updates,
 * - and can be chanined together with other `ReactiveValue`s.
 *
 * A `ReactiveValue` is a read-only view. See {@link MutableReactiveValue} for a
 * read-write view.
 *
 * Static methods in the `ReactiveValue` and `MutableReactiveValue` classes are
 * constructors (e.g. `fromImmutable`).
 *
 * Avoid extending this class from an external library, as that may not be stable.
 */
export abstract class ReactiveValue<T> {
	/**
	 * Returns a reference to the current value of this `ReactiveValue`.
	 *
	 * The result of this **should not be modified** (use `setValue` instead).
	 */
	public abstract get(): T;

	/**
	 * Registers a listener that is notified when the value of this changes.
	 */
	public abstract onUpdate(listener: UpdateCallback<T>): ListenerResult;

	/**
	 * Calls `callback` immediately, then registers `callback` as an onUpdateListener.
	 *
	 * @see {@link onUpdate}.
	 */
	public abstract onUpdateAndNow(callback: UpdateCallback<T>): ListenerResult;

	/** Returns a promise that resolves when this value is next changed. */
	public waitForNextUpdate(): Promise<T> {
		return new Promise<T>((resolve) => {
			const listener = this.onUpdate((value) => {
				listener.remove();
				resolve(value);
			});
		});
	}

	/** Creates a `ReactiveValue` with an initial value, `initialValue`. */
	public static fromInitialValue<T>(initialValue: T): MutableReactiveValue<T> {
		return new ReactiveValueImpl(initialValue);
	}

	/** Returns a `ReactiveValue` that is **known** will never change. */
	public static fromImmutable<T>(value: T): ReactiveValue<T> {
		return {
			get: () => value,
			onUpdate: noOpSetUpdateListener,
			onUpdateAndNow: (callback) => {
				callback(value);
				return noOpUpdateListenerResult;
			},
			// Never resolves -- immutable.
			waitForNextUpdate: () => new Promise<T>(() => {}),
		};
	}

	/**
	 * Creates a `ReactiveValue` whose values come from `callback`.
	 *
	 * `callback` is called whenever any of `sourceValues` are updated and initially to
	 * set the initial value of the result.
	 */
	public static fromCallback<T>(
		callback: () => T,
		sourceValues: ReactiveValue<any>[],
	): ReactiveValue<T> {
		const result = new ReactiveValueImpl(callback());
		const resultRef =
			typeof WeakRef !== 'undefined' ? new WeakRef(result) : { deref: () => result };

		for (const value of sourceValues) {
			const listener = value.onUpdate(() => {
				// Use resultRef to allow `result` to be garbage collected
				// despite this listener.
				const value = resultRef.deref();
				if (value) {
					value.set(callback());
				} else {
					listener.remove();
				}
			});
		}

		return result;
	}

	/**
	 * Returns a reactive value derived from a single `source`.
	 *
	 * If `inverseMap` is `undefined`, the result is a read-only view.
	 */
	public static map<A, B>(
		source: ReactiveValue<A>,
		map: (a: A) => B,
		inverseMap?: undefined,
	): ReactiveValue<B>;

	/**
	 * Returns a reactive value derived from a single `source`.
	 */
	public static map<A, B>(
		source: ReactiveValue<A>,
		map: (a: A) => B,
		inverseMap: (b: B) => A,
	): MutableReactiveValue<B>;

	public static map<A, B>(
		source: MutableReactiveValue<A>,
		map: (a: A) => B,
		inverseMap: ((b: B) => A) | undefined,
	): ReactiveValue<B> | MutableReactiveValue<B> {
		const result = ReactiveValue.fromInitialValue(map(source.get()));

		let expectedResultValue = result.get();
		source.onUpdate((newValue) => {
			expectedResultValue = map(newValue);
			result.set(expectedResultValue);
		});

		if (inverseMap) {
			result.onUpdate((newValue) => {
				// Prevent infinite loops if inverseMap is not a true
				// inverse.
				if (newValue !== expectedResultValue) {
					source.set(inverseMap(newValue));
				}
			});
		}

		return result;
	}

	public static union<Values extends [...unknown[]]>(
		values: ReactiveValuesOf<Values>,
	): ReactiveValue<Values> {
		return ReactiveValue.fromCallback(() => {
			return values.map((value) => value.get()) as [...Values];
		}, values);
	}
}

export abstract class MutableReactiveValue<T> extends ReactiveValue<T> {
	/**
	 * Changes the value of this and, if different, fires all update listeners.
	 *
	 * @see {@link onUpdate}
	 */
	public abstract set(newValue: T): void;

	public static fromProperty<SourceType extends object, Name extends keyof SourceType>(
		sourceValue: MutableReactiveValue<SourceType>,
		propertyName: Name,
	): MutableReactiveValue<SourceType[Name]> {
		const child = ReactiveValue.fromInitialValue(sourceValue.get()[propertyName]);
		const childRef = typeof WeakRef !== 'undefined' ? new WeakRef(child) : { deref: () => child };

		// When the source is updated...
		const sourceListener = sourceValue.onUpdate((newValue) => {
			const childValue = childRef.deref();

			if (childValue) {
				childValue.set(newValue[propertyName]);
			} else {
				// TODO: What if `sourceValue` would be dropped before
				// the child value?
				sourceListener.remove();
			}
		});

		// When the child is updated, also apply the update to the
		// parent.
		child.onUpdate((newValue) => {
			sourceValue.set({
				...sourceValue.get(),
				[propertyName]: newValue,
			});
		});

		return child;
	}
}

// @internal
class ReactiveValueImpl<T> extends MutableReactiveValue<T> {
	#value: T;
	#onUpdateListeners: Array<(value: T) => void>;

	public constructor(initialValue: T) {
		super();

		this.#value = initialValue;
		this.#onUpdateListeners = [];
	}

	public set(newValue: T) {
		if (this.#value === newValue) {
			return;
		}

		this.#value = newValue;

		for (const listener of this.#onUpdateListeners) {
			listener(newValue);
		}
	}

	public get() {
		return this.#value;
	}

	public onUpdate(listener: (value: T) => void) {
		// **Note**: If memory is a concern, listeners should avoid referencing this
		// reactive value directly. Doing so allows the value to be garbage collected when
		// no longer referenced.

		this.#onUpdateListeners.push(listener);

		return {
			remove: () => {
				this.#onUpdateListeners = this.#onUpdateListeners.filter((otherListener) => {
					return otherListener !== listener;
				});
			},
		};
	}

	public onUpdateAndNow(callback: (value: T) => void) {
		callback(this.get());
		return this.onUpdate(callback);
	}
}

export default ReactiveValue;
