import listenForLongPressOrHover from './listenForLongPressOrHover';

/**
 * When a pointer is inside `element`, after a delay, adds the `has-long-press-or-hover`
 * CSS class to `element`.
 *
 * When no pointers are inside `element`, adds the CSS class `no-long-press-or-hover`.
 */
const addLongPressOrHoverCssClasses = (element: HTMLElement, options?: { timeout: number, }) => {
	const hasLongPressClass = 'has-long-press-or-hover';
	const noLongPressClass = 'no-long-press-or-hover';

	element.classList.add('no-long-press-or-hover');

	const { removeListeners } = listenForLongPressOrHover(element, {
		onStart() {
			element.classList.remove(noLongPressClass);
			element.classList.add(hasLongPressClass);
		},
		onEnd() {
			element.classList.add(noLongPressClass);
			element.classList.remove(hasLongPressClass);
		},
		longPressTimeout: options?.timeout,
	});

	return {
		removeEventListeners: () => {
			element.classList.remove(noLongPressClass);
			removeListeners();
		},
	};
};

export default addLongPressOrHoverCssClasses;
