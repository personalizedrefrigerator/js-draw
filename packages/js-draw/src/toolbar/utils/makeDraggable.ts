import { Vec2 } from '@js-draw/math';

interface DragStatistics {
	// Whether the drag was small enough that it was roughly
	// a click event.
	roughlyClick: boolean;

	// Timestamp (as from performance.now) that the drag
	// ended.
	endTimestamp: number;

	// Change in x and y position from the start of the gesture
	displacement: Vec2;
}

interface DraggableOptions {
	// A list of child elements that should certainly be draggable,
	// regardless of tag name
	draggableChildElements: HTMLElement[];

	onDrag(deltaX: number, deltaY: number, totalDisplacement: Vec2): void;
	onDragEnd(dragStatistics: DragStatistics): void;
}

export interface DragControl {
	removeListeners(): void;
}

const makeDraggable = (dragElement: HTMLElement, options: DraggableOptions): DragControl => {
	const dragElements = [...options.draggableChildElements, dragElement];
	let lastX = 0;
	let lastY = 0;
	let startX = 0;
	let startY = 0;
	let pointerDown = false;
	let capturedPointerId: number | null = null;

	const isDraggableElement = (element: HTMLElement | null) => {
		if (!element) {
			return false;
		}

		if (dragElements.includes(element)) {
			return true;
		}

		// Some inputs handle dragging themselves. Don't also interpret such gestures
		// as dragging the dropdown.
		const undraggableElementTypes = ['INPUT', 'SELECT', 'IMG'];

		let hasSuitableAncestors = false;
		let ancestor = element.parentElement;
		while (ancestor) {
			if (undraggableElementTypes.includes(ancestor.tagName)) {
				break;
			}
			if (dragElements.includes(ancestor)) {
				hasSuitableAncestors = true;
				break;
			}
			ancestor = ancestor.parentElement;
		}

		return !undraggableElementTypes.includes(element.tagName) && hasSuitableAncestors;
	};

	const removeEventListenerCallbacks: Array<() => void> = [];

	type PointerListenerType =
		| 'pointerdown'
		| 'pointermove'
		| 'pointerup'
		| 'pointerleave'
		| 'pointercancel';
	type PointerEventListener = (event: PointerEvent) => void;
	const addEventListener = (
		listenerType: PointerListenerType,
		listener: PointerEventListener,
		options?: AddEventListenerOptions,
	) => {
		dragElement.addEventListener(listenerType, listener, options);

		removeEventListenerCallbacks.push(() => {
			dragElement.removeEventListener(listenerType, listener);
		});
	};

	const clickThreshold = 5;

	// Returns whether the current (or if no current, **the last**) gesture is roughly a click.
	// Because this can be called **after** a gesture has just ended, it should not require
	// the gesture to be in progress.
	const isRoughlyClick = () => {
		return Math.hypot(lastX - startX, lastY - startY) < clickThreshold;
	};

	let startedDragging = false;

	addEventListener(
		'pointerdown',
		(event) => {
			if (event.defaultPrevented || !isDraggableElement(event.target as HTMLElement)) {
				return;
			}

			if (event.isPrimary) {
				startedDragging = false;

				lastX = event.clientX;
				lastY = event.clientY;

				startX = event.clientX;
				startY = event.clientY;

				capturedPointerId = null;
				pointerDown = true;
			}
		},
		{ passive: true },
	);

	const onGestureEnd = (_event: Event) => {
		// If the pointerup/pointercancel event was for a pointer not being tracked,
		if (!pointerDown) {
			return;
		}

		if (capturedPointerId !== null) {
			dragElement.releasePointerCapture(capturedPointerId);
			capturedPointerId = null;
		}

		options.onDragEnd({
			roughlyClick: isRoughlyClick(),
			endTimestamp: performance.now(),
			displacement: Vec2.of(lastX - startX, lastY - startY),
		});
		pointerDown = false;
		startedDragging = false;
	};

	addEventListener('pointermove', (event) => {
		if (!event.isPrimary || !pointerDown) {
			return undefined;
		}

		// Mouse event and no buttons pressed? Cancel the event.
		// This can happen if the event was canceled by a focus change (e.g. by opening a
		// right-click menu).
		if (event.pointerType === 'mouse' && event.buttons === 0) {
			onGestureEnd(event);
			return undefined;
		}

		// Only capture after motion -- capturing early prevents click events in Chrome.
		if (capturedPointerId === null && !isRoughlyClick()) {
			dragElement.setPointerCapture(event.pointerId);
			capturedPointerId = event.pointerId;
		}

		const x = event.clientX;
		const y = event.clientY;
		const dx = x - lastX;
		const dy = y - lastY;

		const isClick =
			Math.abs(x - startX) <= clickThreshold && Math.abs(y - startY) <= clickThreshold;

		if (!isClick || startedDragging) {
			options.onDrag(dx, dy, Vec2.of(x - startX, y - startY));

			lastX = x;
			lastY = y;

			startedDragging = true;
		}
	});

	addEventListener('pointerleave', (event) => {
		// Capture the pointer if it exits the container while dragging.
		if (capturedPointerId === null && pointerDown && event.isPrimary) {
			dragElement.setPointerCapture(event.pointerId);
			capturedPointerId = event.pointerId;
		}
	});

	addEventListener('pointerup', onGestureEnd);
	addEventListener('pointercancel', onGestureEnd);

	return {
		removeListeners: () => {
			for (const removeListenerCallback of removeEventListenerCallbacks) {
				removeListenerCallback();
			}
		},
	};
};

export default makeDraggable;
