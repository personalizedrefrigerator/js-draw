import listenForLongPressOrHover from './listenForLongPressOrHover';

describe('listenForLongPressOrHover', () => {
	it('should trigger onStart and onEnd callbacks on long press start/end', async () => {
		const element = document.createElement('div');

		const onStart = jest.fn();
		const onEnd = jest.fn();
		const listener = listenForLongPressOrHover(element, {
			onStart, onEnd,
		});

		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 0 }));

		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(1000);

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onEnd).not.toHaveBeenCalled();

		// onEnd should not trigger automatically
		await jest.advanceTimersByTimeAsync(1000);
		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onEnd).not.toHaveBeenCalled();

		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 0 }));

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onEnd).toHaveBeenCalledTimes(1);

		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 1 }));
		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 2 }));
		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onEnd).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(1000);
		expect(onStart).toHaveBeenCalledTimes(2);

		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1 }));
		expect(onEnd).toHaveBeenCalledTimes(2);

		// Only one long press can be happening on the same element. onEnd should not
		// be called an additional time.
		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 2 }));
		expect(onEnd).toHaveBeenCalledTimes(2);

		// Should allow pointer IDs to be re-used.
		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 0 }));
		await jest.advanceTimersByTimeAsync(1000);

		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 0 }));
		expect(onEnd).toHaveBeenCalledTimes(3);
		expect(onStart).toHaveBeenCalledTimes(3);

		// Should not respond to events after listeners have been removed.
		listener.removeListeners();

		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 0 }));
		await jest.advanceTimersByTimeAsync(1000);
		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 0 }));

		expect(onEnd).toHaveBeenCalledTimes(3);
		expect(onStart).toHaveBeenCalledTimes(3);
	});

	it('should not trigger callback on long press cancel', async () => {
		const element = document.createElement('div');

		const onStart = jest.fn();
		const onEnd = jest.fn();
		listenForLongPressOrHover(element, { onStart, onEnd });


		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 0 }));
		await jest.advanceTimersByTimeAsync(10);
		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 0 }));

		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();

		element.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 0 }));
		await jest.advanceTimersByTimeAsync(1000);
		element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 0 }));
		expect(onStart).toHaveBeenCalled();
		expect(onEnd).toHaveBeenCalled();
	});
});
