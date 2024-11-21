import type Editor from '../Editor';
import makeMessageDialog from './makeMessageDialog';

export interface AboutDialogLink {
	kind: 'link';
	text: string;
	href: string;
}

export interface AboutDialogEntry {
	heading: string | AboutDialogLink;
	text?: string;
	minimized?: boolean;
}

const makeAboutDialog = (editor: Editor, entries: AboutDialogEntry[]) => {
	const dialog = makeMessageDialog(editor, {
		title: editor.localization.about,
		contentClassNames: ['about-dialog-content'],
	});

	for (const entry of entries) {
		const container = document.createElement(entry.minimized ? 'details' : 'div');
		container.classList.add('about-entry');

		const header = document.createElement(entry.minimized ? 'summary' : 'h2');

		if (typeof entry.heading === 'string') {
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

		dialog.appendChild(container);
	}

	return {
		close: () => {
			return dialog.close();
		},
	};
};

export default makeAboutDialog;
