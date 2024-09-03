import waitForTimeout from '../../util/waitForTimeout';
import Editor from '../../Editor';
import { IconElemType } from '../../toolbar/IconProvider';
import { Point2 } from '@js-draw/math';
import { EditorEventType } from '../../types';

interface MenuOption<KeyType> {
	key: KeyType;
	text: string;
	icon: ()=>IconElemType;
}

let idCounter = 0;

const createMenuOverlay = async <KeyType> (editor: Editor, canvasAnchor: Point2, options: MenuOption<KeyType>[]) => {
	const overlay = document.createElement('div');
	const { remove: removeOverlay } = editor.createHTMLOverlay(overlay);

	const menuModal = document.createElement('dialog');
	menuModal.classList.add('editor-popup-menu');

	const hideMenuTimeout = 240;
	menuModal.style.setProperty('--hide-menu-animation-timeout', `${hideMenuTimeout}ms`);
	const updateMenuLocation = () => {
		const overlayRect = editor.getOutputBBoxInDOM();
		const anchor = editor.viewport.canvasToScreen(canvasAnchor).plus(overlayRect.topLeft);
		menuModal.style.setProperty('--anchor-x', `${anchor.x}px`);
		menuModal.style.setProperty('--anchor-y', `${anchor.y}px`);
	};
	updateMenuLocation();
	const viewportChangeListener = editor.notifier.on(EditorEventType.ViewportChanged, updateMenuLocation);

	overlay.appendChild(menuModal);

	let dismissing = false;
	const dismissMenu = async () => {
		if (dismissing) return;
		dismissing = true;

		viewportChangeListener.remove();
		menuModal.classList.add('-hide');
		await waitForTimeout(hideMenuTimeout);
		menuModal.close();
	};

	return new Promise<KeyType|null>(resolve => {
		let resolved = false;
		let result: KeyType|null = null;
		const resolveWithSelectedResult = () => {
			if (!resolved) {
				resolve(result);
				resolved = true;
			}
		};

		menuModal.onclose = () => {
			removeOverlay();
			resolveWithSelectedResult();
		};

		const onOptionSelected = (key: KeyType|null) => {
			result = key;
			void dismissMenu();

			// To properly handle clipboard events, this needs to be called synchronously
			// and not after a delay:
			resolveWithSelectedResult();
		};

		editor.handlePointerEventsExceptClicksFrom(menuModal, (eventName, event) => {
			if (event.target === menuModal && eventName === 'pointerdown') {
				void dismissMenu();
				return true;
			} else if (dismissing) {
				// Send pointer events to the editor if the dialog is in the process of being
				// dismissed (e.g. pointermove events just after a pointerdown outside of the
				// editor).
				return true;
			}
			return false;
		}, (_eventName, event) => {
			return event.target === menuModal;
		});

		const contentElement = document.createElement('div');
		contentElement.classList.add('content');
		contentElement.role = 'menu';

		const optionElements: HTMLElement[] = [];

		// Keyboard focus handling as described in
		// - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/menu_role and
		// - https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
		contentElement.addEventListener('keydown', (event) => {
			const focusedIndex = optionElements.findIndex(item => item === document.activeElement);
			if (focusedIndex === -1) return;
			let newFocusedIndex = focusedIndex;

			if (event.key === 'ArrowDown') {
				newFocusedIndex ++;
			} else if (event.key === 'ArrowUp') {
				newFocusedIndex --;
			} else if (event.key === 'End') {
				newFocusedIndex = optionElements.length - 1;
			} else if (event.key === 'Home') {
				newFocusedIndex = 0;
			}

			if (newFocusedIndex < 0) {
				newFocusedIndex += optionElements.length;
			}
			newFocusedIndex %= optionElements.length;

			if (newFocusedIndex !== focusedIndex) {
				event.preventDefault();
				optionElements[newFocusedIndex].focus();
			}
		});

		for (const option of options) {
			const optionElement = document.createElement('button');
			optionElement.id = `menu-overlay-option-${idCounter++}`;
			optionElement.role = 'menuitem';
			optionElement.classList.add('option', 'editor-popup-menu-option');
			optionElement.replaceChildren(
				option.icon(),
				document.createTextNode(option.text),
			);
			optionElement.onclick = (event) => {
				if (event.defaultPrevented) return;

				onOptionSelected(option.key);
			};
			contentElement.appendChild(optionElement);

			if (optionElements.length === 0) {
				optionElement.autofocus = true;
			}
			optionElements.push(optionElement);
		}

		menuModal.appendChild(contentElement);
		menuModal.showModal();

		// Ensures that the menu is visible even if triggered near the edge of the screen.
		contentElement.scrollIntoView({ block: 'nearest' });
	});
};

export default createMenuOverlay;