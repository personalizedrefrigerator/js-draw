import { reactiveValueFromCallback, reactiveValueFromImmutable, reactiveValueFromInitialValue } from './ReactiveValue';

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
});