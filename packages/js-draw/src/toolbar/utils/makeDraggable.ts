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

		// Some elements need to handle drag events to avoid breaking the UI:
		const undraggableElementTypes = ['INPUT', 'SELECT'];

		let hasSuitableAncestors = false;
		let ancestor = element.parentElement;
		while (ancestor) {
			if (undraggableElementTypes.includes(ancestor.tagName)) break;
			if (dragElements.includes(ancestor)) {
				hasSuitableAncestors = true;
				break;
			}
			ancestor = ancestor.parentElement;
		}

		return !undraggableElementTypes.includes(element.tagName) && hasSuitableAncestors;
	};

	const canScrollAncestorVertically = (element: EventTarget | null, direction: Vec2) => {
		if (!(element instanceof HTMLElement)) return false;

		let ancestor: HTMLElement | null = element;
		// Only consider ancestors within the draggable element: This should not
		// consider the main document scroll element:
		while (ancestor && !dragElements.includes(ancestor)) {
			// Workaround: Certain content can't scroll completely to the start/end
			// (e.g. paged lists). To work around this, define a small, non-zero
			// tolerance. Within this tolerance, the element is considered "completely
			// scrolled":
			const epsilon = 10;

			if (ancestor.scrollHeight > ancestor.clientHeight + epsilon) {
				const canScrollUp = ancestor.scrollTop > epsilon;
				const canScrollDown =
					ancestor.scrollTop + ancestor.clientHeight < ancestor.scrollHeight - epsilon;

				if (direction.y < 0 && canScrollDown) return true;
				if (direction.y > 0 && canScrollUp) return true;
			}
			ancestor = ancestor.parentElement;
		}
		return false;
	};

	const removeEventListenerCallbacks: Array<() => void> = [];

	type PointerListenerType =
		| 'pointerdown'
		| 'pointermove'
		| 'pointerup'
		| 'pointerleave'
		| 'pointercancel';
	type TouchListenerType = 'touchstart' | 'touchmove';
	type ListenerType = PointerListenerType | TouchListenerType;
	type EventType = {
		[key in ListenerType]: key extends PointerListenerType ? PointerEvent : TouchEvent;
	};
	const addEventListener = <T extends ListenerType>(
		listenerType: T,
		listener: (event: EventType[T]) => void,
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
	const isRoughlyClick = (currentX: number, currentY: number) => {
		return Math.hypot(currentX - startX, currentY - startY) < clickThreshold;
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
			roughlyClick: isRoughlyClick(lastX, lastY),
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

		const x = event.clientX;
		const y = event.clientY;
		const isClick = isRoughlyClick(x, y);
		const dx = x - lastX;
		const dy = y - lastY;

		const deltaToStart = Vec2.of(x - startX, y - startY);
		const isScroll = () => canScrollAncestorVertically(event.target, deltaToStart);

		if (startedDragging || (!isClick && !isScroll())) {
			options.onDrag(dx, dy, deltaToStart);

			if (capturedPointerId === null) {
				dragElement.setPointerCapture(event.pointerId);
				capturedPointerId = event.pointerId;
			}

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

	// In Chrome (as of Dec 2025), .preventDefault needs to be called from ontouchmove
	// to allow the drag event to continue to be handled.
	addEventListener('touchmove', (event) => {
		if (startedDragging && event.touches.length > 0) {
			event.preventDefault();
		}
	});

	return {
		removeListeners: () => {
			for (const removeListenerCallback of removeEventListenerCallbacks) {
				removeListenerCallback();
			}
		},
	};
};

export default makeDraggable;
