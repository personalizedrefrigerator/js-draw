import type Editor from '../Editor';

export interface AboutDialogLink {
	kind: 'link',
	text: string;
	href: string;
}

export interface AboutDialogEntry {
	heading: string|AboutDialogLink;
	text?: string;
	minimized?: boolean;
}

const makeAboutDialog = (editor: Editor, entries: AboutDialogEntry[]) => {
	const overlay = document.createElement('div');
	const { remove: removeOverlay } = editor.createHTMLOverlay(overlay);

	overlay.classList.add('dialog-container', 'about-dialog-container');
	const dialog = document.createElement('dialog');

	const heading = document.createElement('h1');
	heading.innerText = editor.localization.about;
	heading.setAttribute('autofocus', 'true');

	const closeButton = document.createElement('button');
	closeButton.innerText = editor.localization.closeDialog;
	closeButton.classList.add('close-button');

	closeButton.onclick = () => removeOverlay();
	overlay.onclick = event => {
		if (event.target === overlay) {
			removeOverlay();
		}
	};

	const licenseContainer = document.createElement('div');
	licenseContainer.classList.add('about-entry-container');

	// Allow scrolling in the license container -- don't forward wheel events.
	licenseContainer.onwheel = evt => evt.stopPropagation();

	for (const entry of entries) {
		const container = document.createElement(entry.minimized ? 'details' : 'div');
		container.classList.add('about-entry');

		const header = document.createElement(entry.minimized ? 'summary' : 'h2');

		if (typeof (entry.heading) === 'string') {
			header.innerText = entry.heading;
		} else {
			const link = document.createElement('a');
			link.href = entry.heading.href.replace(/^javascript:/i, '');
			link.text = entry.heading.text;
			header.appendChild(link);
		}

		container.appendChild(header);

		if (entry.text) {
			const bodyText = document.createElement('div');
			bodyText.innerText = entry.text;

			container.appendChild(bodyText);
		}

		licenseContainer.appendChild(container);
	}

	dialog.replaceChildren(heading, licenseContainer, closeButton);
	overlay.replaceChildren(dialog);

	dialog.show();

	return {
		close: () => {
			removeOverlay();
		},
	};
};

export default makeAboutDialog;
