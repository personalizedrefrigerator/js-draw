import makeMessageDialog from '../../../dialogs/makeMessageDialog';
import Editor from '../../../Editor';
import ClipboardHandler from '../../../util/ClipboardHandler';

const makeClipboardErrorHandlers = (editor: Editor) => {
	const makeErrorDialog = (error: Error | unknown) => {
		const dialog = makeMessageDialog(editor, {
			title: editor.localization.copyPasteError__heading,
			classNames: ['clipboard-error-dialog'],
		});
		dialog.appendChild(document.createTextNode(editor.localization.copyPasteError__description));

		const errorDetailsElement = document.createElement('details');
		const errorDetailsSummary = document.createElement('summary');
		errorDetailsSummary.textContent = editor.localization.copyPasteError__errorDetails;
		errorDetailsElement.appendChild(errorDetailsSummary);
		errorDetailsElement.appendChild(document.createTextNode(`Error: ${error}`));

		dialog.appendChild(errorDetailsElement);

		return dialog;
	};

	return {
		async onCopyError(error: Error | unknown) {
			makeErrorDialog(error);
		},
		onPasteError(error: Error | unknown) {
			const dialog = makeErrorDialog(error);

			const textboxLabel = document.createElement('label');
			textboxLabel.textContent = editor.localization.copyPasteError__pasteRetry;
			const pasteTextbox = document.createElement('textarea');
			textboxLabel.appendChild(pasteTextbox);

			const retryHandler = new ClipboardHandler(editor);
			const handlePaste = (event: ClipboardEvent | DragEvent) => {
				event.preventDefault();

				// Use .then to ensure that .paste runs within the event handler.
				// Paste can fail if certain logic is run async.
				return retryHandler.paste(event).then((pasted: boolean) => {
					if (pasted) {
						dialog.close();
					}
				});
			};
			pasteTextbox.onpaste = handlePaste;
			pasteTextbox.ondrop = handlePaste;

			dialog.appendChild(textboxLabel);
		},
	};
};

export default makeClipboardErrorHandlers;
