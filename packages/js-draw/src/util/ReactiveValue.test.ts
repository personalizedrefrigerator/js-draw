import { ReactiveValue, MutableReactiveValue } from './ReactiveValue';

describe('ReactiveValue', () => {
	it('should fire update listeners on update', () => {
		const value = ReactiveValue.fromInitialValue(3);
		const listener = jest.fn();
		const onUpdateListener = value.onUpdateAndNow(listener);

		expect(listener).toHaveBeenCalledWith(3);
		expect(listener).toHaveBeenCalledTimes(1);

		value.set(2);

		expect(listener).toHaveBeenLastCalledWith(2);
		expect(listener).toHaveBeenCalledTimes(2);

		onUpdateListener.remove();

		value.set(4);
		expect(listener).toHaveBeenCalledTimes(2);

		// Should be able to call remove multiple times without error.
		onUpdateListener.remove();
		value.set(6);
	});

	it('values from callbacks should derive values from the callback', () => {
		const sourceValue1 = ReactiveValue.fromInitialValue('test');
		const sourceValue2 = ReactiveValue.fromInitialValue('test2');
		const sourceValue3 = ReactiveValue.fromImmutable(3);

		// Create a value that is computed from the three above values.
		const derivedValue1 = ReactiveValue.fromCallback(() => {
			return [sourceValue1.get(), sourceValue2.get(), sourceValue3.get()].join(',');
		}, [sourceValue1, sourceValue2, sourceValue3]);

		const derivedValue1Listener = jest.fn();
		derivedValue1.onUpdate(derivedValue1Listener);

		expect(derivedValue1.get()).toBe('test,test2,3');
		expect(derivedValue1Listener).toHaveBeenCalledTimes(0);

		// Create a value that is computed just from derivedValue1
		const derivedValue2 = ReactiveValue.fromCallback(() => {
			return derivedValue1.get() + '!';
		}, [derivedValue1]);

		const derivedValue2Listener = jest.fn();
		derivedValue2.onUpdate(derivedValue2Listener);

		expect(derivedValue2.get()).toBe('test,test2,3!');
		expect(derivedValue1Listener).toHaveBeenCalledTimes(0);
		expect(derivedValue2Listener).toHaveBeenCalledTimes(0);

		// Changing the source values should update the derived values
		sourceValue1.set('...');

		// The change should trigger the listeners
		expect(derivedValue1Listener).toHaveBeenCalledTimes(1);
		expect(derivedValue1Listener).toHaveBeenCalledWith(derivedValue1.get());
		expect(derivedValue2Listener).toHaveBeenCalledTimes(1);
		expect(derivedValue2Listener).toHaveBeenCalledWith(derivedValue2.get());

		// The values should be updated to the expected values.
		expect(derivedValue1.get()).toBe('...,test2,3');
		expect(derivedValue2.get()).toBe('...,test2,3!');

		// Something similar should happen when other values are changed
		sourceValue1.set('1');
		sourceValue2.set('2');

		expect(derivedValue1.get()).toBe('1,2,3');
		expect(derivedValue2.get()).toBe('1,2,3!');
	});

	it('should be able to create values from properties', () => {
		const sourceValue = ReactiveValue.fromInitialValue({
			a: 1,
			b: 2,
			c: { d: 3 },
		});

		const destValue1 = MutableReactiveValue.fromProperty(sourceValue, 'c');
		const destValue2 = MutableReactiveValue.fromProperty(sourceValue, 'b');
		expect(destValue1.get()).toBe(sourceValue.get().c);
		expect(destValue2.get()).toBe(2);

		// Updating the source value should update the destination values.
		sourceValue.set({
			...sourceValue.get(),
			c: { d: 4 },
		});

		expect(destValue1.get()).toBe(sourceValue.get().c);
		expect(destValue1.get().d).toBe(4);
		expect(destValue2.get()).toBe(2);

		sourceValue.set({
			a: 3,
			b: 4,
			c: { d: 5 },
		});
		expect(destValue1.get().d).toBe(5);
		expect(destValue2.get()).toBe(4);

		// Updating the destination values should update the source values
		destValue1.set({ d: 8 });
		expect(sourceValue.get().c.d).toBe(8);

		destValue2.set(5);
		expect(sourceValue.get().b).toBe(5);
	});

	it('mutable map should be bidirectional', () => {
		const sourceValue = ReactiveValue.fromInitialValue(5);
		const mappedValue = MutableReactiveValue.map(
			sourceValue,
			(a) => a ** 2,
			(b) => Math.sqrt(b),
		);

		expect(mappedValue.get()).toBeCloseTo(25);

		// Changing the destination should change the source
		mappedValue.set(26);
		expect(sourceValue.get()).toBeCloseTo(Math.sqrt(26));

		// Changing the source should change the destination
		sourceValue.set(10);
		expect(mappedValue.get()).toBeCloseTo(100);
	});

	it('single-directional map should apply the given mapping function', () => {
		const sourceValue = ReactiveValue.fromInitialValue(1);
		const midValue = ReactiveValue.map(sourceValue, (a) => a * 2);
		const destValue = ReactiveValue.map(midValue, (_) => 0);

		const sourceUpdateFn = jest.fn();
		const midUpdateFn = jest.fn();
		const destUpdateFn = jest.fn();

		sourceValue.onUpdate(sourceUpdateFn);
		midValue.onUpdate(midUpdateFn);
		destValue.onUpdate(destUpdateFn);

		// Initial value checking
		expect(destValue.get()).toBe(0);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(0);
		expect(midUpdateFn).toHaveBeenCalledTimes(0);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);

		// Setting to the same value should trigger no listeners
		sourceValue.set(1);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(0);
		expect(midUpdateFn).toHaveBeenCalledTimes(0);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);

		// Changing the initial value should only fire listeners that
		// result in a different value
		sourceValue.set(2);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(1);
		expect(midUpdateFn).toHaveBeenCalledTimes(1);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);
		expect(midValue.get()).toBe(4);
	});
});
