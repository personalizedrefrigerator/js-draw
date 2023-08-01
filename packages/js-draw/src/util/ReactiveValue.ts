
type ListenerResult = { remove(): void; };
type UpdateCallback<T> = (value: T)=>void;

/**
 * A `ReactiveValue` is a value that
 * - updates periodically,
 * - can fire listeners when it updates,
 * - and can be chanined together with other `ReactiveValue`s.
 *
 * A `ReactiveValue` is a read-only view. See {@link MutableReactiveValue} for a
 * read-write view.
 */
export interface ReactiveValue<T> {
	/**
	 * Returns a reference to the current value of this `ReactiveValue`.
	 *
	 * The result of this **should not be modified** (use `setValue` instead).
	 */
	get(): T;

	/**
	 * Registers a listener that is notified when the value of this changes.
	 */
	onUpdate(listener: UpdateCallback<T>): ListenerResult;

	/**
	 * Calls `callback` immediately, then registers `callback` as an onUpdateListener.
	 *
	 * @see {@link onUpdate}.
	 */
	onUpdateAndNow(callback: UpdateCallback<T>): ListenerResult;
}

export interface MutableReactiveValue<T> extends ReactiveValue<T> {
	/**
	 * Changes the value of this and fires all update listeners.
	 *
	 * @see {@link onUpdate}
	 */
	set(newValue: T): void;
}

const noOpUpdateListenerResult = {
	remove() { }
};

/**
 * An update listener that does nothing. Useful for reactive values
 * that will never change.
 */
const noOpSetUpdateListener = () => {
	return noOpUpdateListenerResult;
};

// @internal
class ReactiveValueImpl<T> implements MutableReactiveValue<T> {
	#value: T;
	#onUpdateListeners: Array<(value: T)=>void>;

	public constructor(initialValue: T) {
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

	public onUpdate(listener: (value: T)=>void) {
		// **Note**: If memory is a concern, listeners should avoid referencing this
		// reactive value directly. Doing so allows the value to be garbage collected when
		// no longer referenced.

		this.#onUpdateListeners.push(listener);

		return {
			remove: () => {
				this.#onUpdateListeners = this.#onUpdateListeners.filter(otherListener => {
					return otherListener !== listener;
				});
			},
		};
	}

	public onUpdateAndNow(callback: (value: T)=>void) {
		callback(this.get());
		return this.onUpdate(callback);
	}
}

/**
 * Creates a `ReactiveValue` whose values come from `callback`.
 *
 * `callback` is called whenever any of `sourceValues` are updated and initially to
 * set the initial value of the result.
 */
export const reactiveValueFromCallback = <T> (
	callback: ()=>T, sourceValues: ReactiveValue<any>[]
): ReactiveValue<T> => {
	const result = new ReactiveValueImpl(callback());
	const resultRef = new WeakRef(result);

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
};

/** Creates a `ReactiveValue` with an initial value, `initialValue`. */
export const reactiveValueFromInitialValue = <T> (
	initialValue: T
): MutableReactiveValue<T> => {
	return new ReactiveValueImpl(initialValue);
};

/** Returns a `ReactiveValue` that is **known** will never change. */
export const reactiveValueFromImmutable = <T> (
	value: T
): ReactiveValue<T> => {
	return {
		get: () => value,
		onUpdate: noOpSetUpdateListener,
		onUpdateAndNow: callback => {
			callback(value);
			return noOpUpdateListenerResult;
		},
	};
};

export const reactiveValueFromPropertyMutable = <SourceType extends object, Name extends keyof SourceType> (
	sourceValue: MutableReactiveValue<SourceType>,
	propertyName: Name,
): MutableReactiveValue<SourceType[Name]> => {
	const child = reactiveValueFromInitialValue(
		sourceValue.get()[propertyName]
	);
	const childRef = new WeakRef(child);

	// When the source is updated...
	const sourceListener = sourceValue.onUpdate(newValue => {
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
	child.onUpdate(newValue => {
		sourceValue.set({
			...sourceValue.get(),
			[propertyName]: newValue,
		});
	});

	return child;
};

export const mapReactiveValueMutable = <A, B> (
	source: MutableReactiveValue<A>,
	map: (a: A)=>B,
	inverseMap: (b: B)=>A,
): MutableReactiveValue<B> => {
	const result = reactiveValueFromInitialValue(map(source.get()));

	let expectedResultValue = result.get();
	source.onUpdate(newValue => {
		expectedResultValue = map(newValue);
		result.set(expectedResultValue);
	});

	result.onUpdate(newValue => {
		// Prevent infinite loops if inverseMap is not a true
		// inverse.
		if (newValue !== expectedResultValue) {
			source.set(inverseMap(newValue));
		}
	});

	return result;
};

export const mapReactiveValue = <A, B> (
	source: ReactiveValue<A>,
	map: (a: A)=>B,
): ReactiveValue<B> => {
	const result = reactiveValueFromInitialValue(map(source.get()));

	source.onUpdate(newValue => {
		result.set(map(newValue));
	});

	return result;
};

export default ReactiveValue;
