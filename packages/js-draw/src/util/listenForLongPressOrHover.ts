
type Options = {
	onStart: ()=>void;
	onEnd: ()=>void;

	longPressTimeout?: number;
};

/**
 * Calls `options.onStart` at the start of a long press or hover.
 * Calls `options.onEnd` when no pointers are within the container.
 */
const listenForLongPressOrHover = (target: HTMLElement, options: Options) => {
	type PointerRecord = {
		timeEnter: number;
	};

	const pointersInside = new Map<number, PointerRecord>();
	let timeoutId: ReturnType<typeof setTimeout>|null = null;
	let isLongPressInProgress = false;

	const updateTimeout = () => {
		if (pointersInside.size === 0) {
			if (isLongPressInProgress) {
				isLongPressInProgress = false;
				options.onEnd();
			} else if (timeoutId !== null) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		} else {
			const nowTime = Date.now();
			let timeSinceFirstPointer = 0; // ms

			for (const record of pointersInside.values()) {
				const timeSince = nowTime - record.timeEnter;
				timeSinceFirstPointer = Math.max(timeSince, timeSinceFirstPointer);
			}

			const longPressTimeout = options.longPressTimeout ?? 700; // ms

			if (timeoutId !== null) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}

			const timeLeft = longPressTimeout - timeSinceFirstPointer;
			if (timeLeft <= 0) {
				options.onStart();
				isLongPressInProgress = true;
			} else {
				timeoutId = setTimeout(() => {
					timeoutId = null;
					updateTimeout();
				}, timeLeft);
			}
		}
	};

	// Detects long press
	const pointerEventListener = (event: PointerEvent) => {
		const eventRecord = {
			timeEnter: Date.now(),
		};

		if (event.type === 'pointerenter') {
			pointersInside.set(event.pointerId, eventRecord);
		} else if (event.type === 'pointerleave' || event.type === 'pointercancel') {
			// In some cases (for example, a click with a stylus on Android/Chrome), moving the pen
			// over the target, clicking, then moving the pen out of the target produces input
			// similar to this:
			// - pointerenter (pointerId: 4)
			// - pointerleave (pointerId: 4)
			// - pointerenter (pointerId: 6)
			// - pointerenter (pointerId: 1)
			// - pointerleave (pointerId: 6)
			// Observe that no pointerleave event was fired for the pointer with ID 1.
			pointersInside.clear();
		}

		updateTimeout();
	};

	target.addEventListener('pointerenter', pointerEventListener);
	target.addEventListener('pointerleave', pointerEventListener);
	target.addEventListener('pointercancel', pointerEventListener);

	return {
		removeListeners: () => {
			target.removeEventListener('pointerenter', pointerEventListener);
			target.removeEventListener('pointerleave', pointerEventListener);
			target.removeEventListener('pointercancel', pointerEventListener);
		},
	};
};

export default listenForLongPressOrHover;
