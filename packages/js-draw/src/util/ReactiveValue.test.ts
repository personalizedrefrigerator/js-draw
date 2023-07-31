import { mapReactiveValue, mapReactiveValueMutable, reactiveValueFromCallback, reactiveValueFromImmutable, reactiveValueFromInitialValue, reactiveValueFromPropertyMutable } from './ReactiveValue';

describe('ReactiveValue', () => {
	it('should fire update listeners on update', () => {
		const value = reactiveValueFromInitialValue(3);
		const listener = jest.fn();
		const { remove: removeListener } = value.onUpdateAndNow(listener);

		expect(listener).toHaveBeenCalledWith(3);
		expect(listener).toHaveBeenCalledTimes(1);

		value.setValue(2);

		expect(listener).toHaveBeenLastCalledWith(2);
		expect(listener).toHaveBeenCalledTimes(2);

		removeListener();

		value.setValue(4);
		expect(listener).toHaveBeenCalledTimes(2);

		// Should be able to call remove multiple times without error.
		removeListener();
		value.setValue(6);
	});

	it('values from callbacks should derive values from the callback', () => {
		const sourceValue1 = reactiveValueFromInitialValue('test');
		const sourceValue2 = reactiveValueFromInitialValue('test2');
		const sourceValue3 = reactiveValueFromImmutable(3);

		// Create a value that is computed from the three above values.
		const derivedValue1 = reactiveValueFromCallback(() => {
			return [
				sourceValue1.getValue(),
				sourceValue2.getValue(),
				sourceValue3.getValue(),
			].join(',');
		}, [ sourceValue1, sourceValue2, sourceValue3 ]);

		const derivedValue1Listener = jest.fn();
		derivedValue1.addUpdateListener(derivedValue1Listener);

		expect(derivedValue1.getValue()).toBe('test,test2,3');
		expect(derivedValue1Listener).toHaveBeenCalledTimes(0);

		// Create a value that is computed just from derivedValue1
		const derivedValue2 = reactiveValueFromCallback(() => {
			return derivedValue1.getValue() + '!';
		}, [ derivedValue1 ]);

		const derivedValue2Listener = jest.fn();
		derivedValue2.addUpdateListener(derivedValue2Listener);

		expect(derivedValue2.getValue()).toBe('test,test2,3!');
		expect(derivedValue1Listener).toHaveBeenCalledTimes(0);
		expect(derivedValue2Listener).toHaveBeenCalledTimes(0);

		// Changing the source values should update the derived values
		sourceValue1.setValue('...');

		// The change should trigger the listeners
		expect(derivedValue1Listener).toHaveBeenCalledTimes(1);
		expect(derivedValue1Listener).toHaveBeenCalledWith(derivedValue1.getValue());
		expect(derivedValue2Listener).toHaveBeenCalledTimes(1);
		expect(derivedValue2Listener).toHaveBeenCalledWith(derivedValue2.getValue());

		// The values should be updated to the expected values.
		expect(derivedValue1.getValue()).toBe('...,test2,3');
		expect(derivedValue2.getValue()).toBe('...,test2,3!');

		// Something similar should happen when other values are changed
		sourceValue1.setValue('1');
		sourceValue2.setValue('2');

		expect(derivedValue1.getValue()).toBe('1,2,3');
		expect(derivedValue2.getValue()).toBe('1,2,3!');
	});

	it('should be able to create values from properties', () => {
		const sourceValue = reactiveValueFromInitialValue({
			a: 1,
			b: 2,
			c: { d: 3 },
		});

		const destValue1 = reactiveValueFromPropertyMutable(sourceValue, 'c');
		const destValue2 = reactiveValueFromPropertyMutable(sourceValue, 'b');
		expect(destValue1.getValue()).toBe(sourceValue.getValue().c);
		expect(destValue2.getValue()).toBe(2);

		// Updating the source value should update the destination values.
		sourceValue.setValue({
			...sourceValue.getValue(),
			c: { d: 4 },
		});

		expect(destValue1.getValue()).toBe(sourceValue.getValue().c);
		expect(destValue1.getValue().d).toBe(4);
		expect(destValue2.getValue()).toBe(2);

		sourceValue.setValue({
			a: 3,
			b: 4,
			c: { d: 5 },
		});
		expect(destValue1.getValue().d).toBe(5);
		expect(destValue2.getValue()).toBe(4);

		// Updating the destination values should update the source values
		destValue1.setValue({ d: 8 });
		expect(sourceValue.getValue().c.d).toBe(8);

		destValue2.setValue(5);
		expect(sourceValue.getValue().b).toBe(5);
	});

	it('mutable map should be bidirectional', () => {
		const sourceValue = reactiveValueFromInitialValue(5);
		const mappedValue = mapReactiveValueMutable(
			sourceValue, a => a ** 2, b => Math.sqrt(b),
		);

		expect(mappedValue.getValue()).toBeCloseTo(25);

		// Changing the destination should change the source
		mappedValue.setValue(26);
		expect(sourceValue.getValue()).toBeCloseTo(Math.sqrt(26));

		// Changing the source should change the destination
		sourceValue.setValue(10);
		expect(mappedValue.getValue()).toBeCloseTo(100);
	});

	it('single-directional map should apply the given mapping function', () => {
		const sourceValue = reactiveValueFromInitialValue(1);
		const midValue = mapReactiveValue(sourceValue, a => a * 2);
		const destValue = mapReactiveValue(midValue, _ => 0);

		const sourceUpdateFn = jest.fn();
		const midUpdateFn = jest.fn();
		const destUpdateFn = jest.fn();

		sourceValue.addUpdateListener(sourceUpdateFn);
		midValue.addUpdateListener(midUpdateFn);
		destValue.addUpdateListener(destUpdateFn);

		// Initial value checking
		expect(destValue.getValue()).toBe(0);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(0);
		expect(midUpdateFn).toHaveBeenCalledTimes(0);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);

		// Setting to the same value should trigger no listeners
		sourceValue.setValue(1);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(0);
		expect(midUpdateFn).toHaveBeenCalledTimes(0);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);

		// Changing the initial value should only fire listeners that
		// result in a different value
		sourceValue.setValue(2);
		expect(sourceUpdateFn).toHaveBeenCalledTimes(1);
		expect(midUpdateFn).toHaveBeenCalledTimes(1);
		expect(destUpdateFn).toHaveBeenCalledTimes(0);
		expect(midValue.getValue()).toBe(4);
	});
});