import type Editor from '../Editor';
import waitForTimeout from '../util/waitForTimeout';

export interface MessageDialogOptions {
	title: string;
	classNames?: string[];
}

const makeAboutDialog = (editor: Editor, options: MessageDialogOptions) => {
	const overlay = document.createElement('div');
	const { remove: removeOverlay } = editor.createHTMLOverlay(overlay);

	overlay.classList.add(
		'dialog-container',
		'message-dialog-container',
		...(options.classNames ?? []),
	);
	const dialog = document.createElement('dialog');

	const heading = document.createElement('h1');
	heading.textContent = options.title;
	heading.setAttribute('autofocus', 'true');

	const closeButton = document.createElement('button');
	closeButton.innerText = editor.localization.closeDialog;
	closeButton.classList.add('close');

	const contentWrapper = document.createElement('div');
	contentWrapper.classList.add('content');

	// Allow scrolling in the scrollable container -- don't forward wheel events.
	contentWrapper.onwheel = (evt) => evt.stopPropagation();

	dialog.replaceChildren(heading, contentWrapper, closeButton);
	overlay.replaceChildren(dialog);

	const closeTimeout = 300;
	dialog.style.setProperty('--close-delay', `${closeTimeout}ms`);
	const closeDialog = async () => {
		dialog.classList.add('-closing');
		await waitForTimeout(closeTimeout);
		dialog.close();
	};
	const addCloseListeners = () => {
		dialog.addEventListener('pointerdown', (event) => {
			if (event.target === dialog) {
				void closeDialog();
			}
		});
		dialog.onclose = () => {
			removeOverlay();
		};
		closeButton.onclick = () => closeDialog();
	};
	addCloseListeners();

	dialog.showModal();

	return {
		close: () => {
			return closeDialog();
		},
		appendChild: (child: Node) => {
			contentWrapper.appendChild(child);
		},
	};
};

export default makeAboutDialog;
