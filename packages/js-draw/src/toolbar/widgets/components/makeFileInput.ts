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
	label.addEventListener('dragover', event => {
		event.preventDefault();
		label.classList.add('drag-target');
	});
	label.addEventListener('dragenter', event => {
		event.preventDefault();
		label.classList.add('drag-target');
	});
	label.addEventListener('dragleave', event => {
		event.preventDefault();

		// Ensure the event wasn't targeting a child.
		// See https://stackoverflow.com/a/54271161 and
		//     https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/relatedTarget
		const enteringElement = event.relatedTarget as HTMLElement;
		if (!enteringElement || !label.contains(enteringElement)) {
			label.classList.remove('drag-target');
		}
	});

	// See https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop#process_the_drop
	label.addEventListener('drop', event => {
		event.preventDefault();
		label.classList.remove('drag-target');

		const fileList: File[] = [];

		if (event.dataTransfer) {
			fileList.push(...event.dataTransfer.files);
		}

		selectedFiles.set(fileList);
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

	// Update the status text and hide/show the icon.
	selectedFiles.onUpdateAndNow(files => {
		if (files.length > 0) {
			descriptionText.innerText = files.map(file => file.name).join('\n');

			// Only show the icon when there are files
			icon.style.display = 'none';
		} else {
			// Show the icon
			icon.style.display = '';

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
