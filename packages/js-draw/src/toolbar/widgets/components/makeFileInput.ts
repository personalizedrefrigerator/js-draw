import ReactiveValue, { MutableReactiveValue } from '../../../util/ReactiveValue';
import { ToolbarContext } from '../../types';

let idCounter = 0;

/**
 * Creates a stylized file input.
 */
const makeFileInput = (labelText: string, context: ToolbarContext, accepts: string = '*') => {
	const container = document.createElement('div');
	const label = document.createElement('label');
	const input = document.createElement('input');

	const descriptionBox = document.createElement('div');
	descriptionBox.classList.add('toolbar--file-input-description');
	const descriptionText = document.createElement('span');

	container.classList.add('toolbar--file-input-container');

	label.appendChild(document.createTextNode(labelText));
	input.accept = accepts;
	input.type = 'file';

	// Associate the label with the input
	const inputId = `js-draw-file-input-${idCounter ++}`;
	input.setAttribute('id', inputId);
	label.htmlFor = inputId;

	const icon = context.icons.makeUploadFileIcon();
	icon.classList.add('icon');

	descriptionBox.replaceChildren(icon, descriptionText);
	label.appendChild(descriptionBox);
	container.replaceChildren(label, input);

	const selectedFiles: MutableReactiveValue<File[]> = ReactiveValue.fromInitialValue([]);

	// Support droping files
	for (const eventName of [ 'dragover', 'dragenter' ]) {
		label.addEventListener(eventName, event => {
			event.preventDefault();
		});
	}
	label.addEventListener('drop', event => {
		event.preventDefault();

		const fileList = event.dataTransfer?.files ?? [];
		selectedFiles.set([ ...fileList ]);
	});
	input.addEventListener('change', () => {
		const fileList = input.files ?? [];
		selectedFiles.set([ ...fileList ]);
	});

	selectedFiles.onUpdate(files => {
		if (files.length === 0 && input.files && input.files.length > 0) {
			input.value = '';
		}
	});

	// Update the status text
	selectedFiles.onUpdateAndNow(files => {
		if (files.length > 0) {
			descriptionText.innerText = files.map(file => file.name).join('\n');
		} else {
			const text = context.localization.dragAndDropHereOrBrowse;

			// Split into regions surrounded by {{curly braces}} and regions that are
			// not.
			// When given a regular expression, `.split` outputs an array. For example,
			//    "a test __of__ split".split(/__(.*)__/)
			// results in
			//    ['a test ', 'of', ' split'].
			const segments = text.split(/[{]{2}(.*)[}]{2}/g);
			descriptionText.replaceChildren();

			for (let i = 0; i < segments.length; i++) {
				// Inside a {{pair of curly braces}}?
				if (i % 2 === 1) {
					const boldedText = document.createElement('b');
					boldedText.innerText = segments[i];
					descriptionText.appendChild(boldedText);
				} else {
					descriptionText.appendChild(document.createTextNode(segments[i]));
				}
			}
		}
	});

	return {
		container,
		input,
		selectedFiles,
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
	};
};

export default makeFileInput;
