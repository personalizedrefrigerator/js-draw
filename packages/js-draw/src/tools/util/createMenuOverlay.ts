import waitForTimeout from '../../util/waitForTimeout';
import Editor from '../../Editor';
import { IconElemType } from '../../toolbar/IconProvider';
import { Point2, Rect2 } from '@js-draw/math';
import { EditorEventType } from '../../types';

interface MenuOption<KeyType> {
	key: KeyType;
	text: string;
	disabled: boolean;
	icon: ()=>IconElemType;
}

const createMenuOverlay = async <KeyType> (editor: Editor, canvasAnchor: Point2, options: MenuOption<KeyType>[]) => {
	const overlay = document.createElement('div');
	const { remove: removeOverlay } = editor.createHTMLOverlay(overlay);

	const menuContainer = document.createElement('dialog');
	menuContainer.classList.add('editor-popup-menu');

	const hideMenuTimeout = 240;
	menuContainer.style.setProperty('--hide-menu-animation-timeout', `${hideMenuTimeout}ms`);
	const updateMenuLocation = () => {
		const overlayRect = Rect2.of(overlay.getBoundingClientRect());
		const anchor = editor.viewport.canvasToScreen(canvasAnchor).plus(overlayRect.topLeft);
		menuContainer.style.setProperty('--anchor-x', `${anchor.x}px`);
		menuContainer.style.setProperty('--anchor-y', `${anchor.y}px`);
	};
	updateMenuLocation();
	const viewportChangeListener = editor.notifier.on(EditorEventType.ViewportChanged, updateMenuLocation);

	overlay.appendChild(menuContainer);
	menuContainer.showModal();

	const hideMenu = async () => {
		viewportChangeListener.remove();
		menuContainer.classList.add('-hide');
		await waitForTimeout(hideMenuTimeout);
		menuContainer.close();
		removeOverlay();
	};

	return new Promise<KeyType|null>(resolve => {
		const onOptionSelected = async (key: KeyType|null) => {
			await hideMenu();
			resolve(key);
		};

		menuContainer.onclick = async (event) => {
			if (event.target === menuContainer) {
				event.preventDefault();
				await hideMenu();
				resolve(null);
			}
		};

		const contentElement = document.createElement('div');
		contentElement.classList.add('content');

		for (const option of options) {
			const optionContainer = document.createElement('button');
			optionContainer.classList.add('option', 'editor-popup-menu-option');
			optionContainer.replaceChildren(
				option.icon(),
				document.createTextNode(option.text),
			);
			optionContainer.onclick = () => {
				onOptionSelected(option.key);
			};
			contentElement.appendChild(optionContainer);
		}

		menuContainer.appendChild(contentElement);
	});
};

export default createMenuOverlay;