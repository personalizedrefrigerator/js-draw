interface Callbacks {
	filter(event: KeyboardEvent): boolean;
	handleKeyDown(event: KeyboardEvent): void;
	handleKeyUp(event: KeyboardEvent): void;

	/**
	 * Should return `true` iff `source` is also registered as an event listener source.
	 * If `false` and focus leaves the original source, keyup events are fired.
	 */
	getHandlesKeyEventsFrom(source: Node): boolean;
}

/**
 * Calls `callbacks` when different keys are known to be pressed.
 *
 * `filter` can be used to ignore events.
 *
 * This includes keys that didn't trigger a keydown or keyup event, but did cause
 * shiftKey/altKey/metaKey/etc. properties to change on other events (e.g. mousemove
 * events). Artifical events are created for these changes and sent to `callbacks`.
 */
const listenForKeyboardEventsFrom = (elem: HTMLElement, callbacks: Callbacks) => {
	type KeyEventLike = { key: string; code: string };
	type EventWithKeyModifiers = {
		ctrlKey: boolean;
		altKey: boolean;
		shiftKey: boolean;
		metaKey: boolean;
	};
	type KeyDownRecord = EventWithKeyModifiers & KeyEventLike;

	// Track which keys are down so we can release them when the element
	// loses focus. This is particularly important for keys like Control
	// that can trigger shortcuts that cause the editor to lose focus before
	// the keyup event is triggered.
	let keysDown: KeyDownRecord[] = [];

	// Return whether two objects that are similar to keyboard events represent the
	// same key.
	const keyEventsMatch = (a: KeyEventLike, b: KeyEventLike) => {
		return a.key === b.key && a.code === b.code;
	};

	const isKeyDown = (keyEvent: KeyEventLike) => {
		return keysDown.some((other) => keyEventsMatch(other, keyEvent));
	};

	const keyEventToRecord = (event: KeyboardEvent): KeyDownRecord => {
		return {
			code: event.code,
			key: event.key,
			ctrlKey: event.ctrlKey,
			altKey: event.altKey,
			shiftKey: event.shiftKey,
			metaKey: event.metaKey,
		};
	};

	const handleKeyEvent = (htmlEvent: KeyboardEvent) => {
		if (htmlEvent.type === 'keydown') {
			// Add event to the list of keys that are down (so long as it
			// isn't a duplicate).
			if (!isKeyDown(htmlEvent)) {
				// Destructructring, then pushing seems to cause
				// data loss. Copy properties individually:
				keysDown.push(keyEventToRecord(htmlEvent));
			}

			if (!callbacks.filter(htmlEvent)) {
				return;
			}

			callbacks.handleKeyDown(htmlEvent);
		} else {
			// keyup
			console.assert(htmlEvent.type === 'keyup');

			// Remove the key from keysDown -- it's no longer down.
			keysDown = keysDown.filter((event) => {
				const matches = keyEventsMatch(event, htmlEvent);
				return !matches;
			});

			if (!callbacks.filter(htmlEvent)) {
				return;
			}

			callbacks.handleKeyUp(htmlEvent);
		}
	};

	elem.addEventListener('keydown', (htmlEvent) => {
		handleKeyEvent(htmlEvent);
	});

	elem.addEventListener('keyup', (htmlEvent) => {
		handleKeyEvent(htmlEvent);
	});

	elem.addEventListener('focusout', (focusEvent: FocusEvent) => {
		let stillHasFocus = false;
		if (focusEvent.relatedTarget) {
			const relatedTarget = focusEvent.relatedTarget as Node;
			stillHasFocus =
				elem.contains(relatedTarget) || callbacks.getHandlesKeyEventsFrom(relatedTarget);
		}

		if (!stillHasFocus) {
			for (const event of keysDown) {
				callbacks.handleKeyUp(
					new KeyboardEvent('keyup', {
						...event,
					}),
				);
			}
			keysDown = [];
		}
	});

	const fireArtificalEventsBasedOn = (htmlEvent: EventWithKeyModifiers) => {
		let wasShiftDown = false;
		let wasCtrlDown = false;
		let wasAltDown = false;
		let wasMetaDown = false;

		for (const otherEvent of keysDown) {
			const code = otherEvent.code;

			wasShiftDown ||= !!code.match(/^Shift(Left|Right)$/);
			wasCtrlDown ||= !!code.match(/^Control(Left|Right)$/);
			wasAltDown ||= !!code.match(/^Alt(Left|Right)$/);
			wasMetaDown ||= !!code.match(/^Meta(Left|Right)$/);
		}

		const eventName = (isDown: boolean) => {
			if (isDown) {
				return 'keydown';
			} else {
				return 'keyup';
			}
		};

		const eventInitDefaults: EventWithKeyModifiers = {
			shiftKey: htmlEvent.shiftKey,
			altKey: htmlEvent.altKey,
			metaKey: htmlEvent.metaKey,
			ctrlKey: htmlEvent.ctrlKey,
		};

		if (htmlEvent.shiftKey !== wasShiftDown) {
			handleKeyEvent(
				new KeyboardEvent(eventName(htmlEvent.shiftKey), {
					...eventInitDefaults,
					key: 'Shift',
					code: 'ShiftLeft',
				}),
			);
		}

		if (htmlEvent.altKey !== wasAltDown) {
			handleKeyEvent(
				new KeyboardEvent(eventName(htmlEvent.altKey), {
					...eventInitDefaults,
					key: 'Alt',
					code: 'AltLeft',
				}),
			);
		}

		if (htmlEvent.ctrlKey !== wasCtrlDown) {
			handleKeyEvent(
				new KeyboardEvent(eventName(htmlEvent.ctrlKey), {
					...eventInitDefaults,
					key: 'Control',
					code: 'ControlLeft',
				}),
			);
		}

		if (htmlEvent.metaKey !== wasMetaDown) {
			handleKeyEvent(
				new KeyboardEvent(eventName(htmlEvent.metaKey), {
					...eventInitDefaults,
					key: 'Meta',
					code: 'MetaLeft',
				}),
			);
		}
	};

	elem.addEventListener('mousedown', (htmlEvent) => {
		fireArtificalEventsBasedOn(htmlEvent);
	});

	elem.addEventListener('mousemove', (htmlEvent) => {
		fireArtificalEventsBasedOn(htmlEvent);
	});
};

export default listenForKeyboardEventsFrom;
