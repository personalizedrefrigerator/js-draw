import type Editor from '../Editor';
import createButton from '../util/dom/createButton';
import waitForTimeout from '../util/waitForTimeout';

export interface MessageDialogOptions {
	title: string;
	classNames?: string[];
	contentClassNames?: string[];
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
	const contentWrapper = document.createElement('div');
	contentWrapper.classList.add('message-dialog-content', ...(options.contentClassNames ?? []));

	const heading = document.createElement('h1');
	heading.textContent = options.title;
	heading.setAttribute('autofocus', 'true');

	const closeButton = createButton({
		text: editor.localization.closeDialog,
		classList: ['close'],
	});

	const scrollRegion = document.createElement('div');
	scrollRegion.classList.add('scroll');

	// Allow scrolling in the scrollable container -- don't forward wheel events.
	scrollRegion.onwheel = (evt) => evt.stopPropagation();

	contentWrapper.replaceChildren(heading, scrollRegion, closeButton);
	dialog.replaceChildren(contentWrapper);
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
			scrollRegion.appendChild(child);
		},
	};
};

export default makeAboutDialog;
