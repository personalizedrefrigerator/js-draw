import ReactiveValue, { MutableReactiveValue } from '../../../util/ReactiveValue';
import { ToolbarContext } from '../../types';

export interface CustomFilePickerProps {
	setOnCancelCallback(onCancel: ()=>void): void;
}
export type ShowCustomFilePickerCallback = (props: CustomFilePickerProps)=>Promise<File[]|null>;

export interface FileInputOptions {
	readonly accepts?: string;
	readonly allowMultiSelect?: boolean;
	// Should return null when canceled
	readonly customPickerAction?: ShowCustomFilePickerCallback;
}

let idCounter = 0;

/**
 * Creates a stylized file input.
 */
const makeFileInput = (
	labelText: string,
	context: ToolbarContext,
	{ accepts = '*', allowMultiSelect = false, customPickerAction }: FileInputOptions = {},
) => {
	const container = document.createElement('div');
	const label = document.createElement('label');
	const input = document.createElement('input');

	const descriptionBox = document.createElement('div');
	descriptionBox.classList.add('toolbar--file-input-description');
	const descriptionText = document.createElement('span');

	container.classList.add('toolbar--file-input-container');

	label.appendChild(document.createTextNode(labelText));
	input.accept = accepts;
	input.type = customPickerAction ? 'button' : 'file';
	input.classList.add('file-input');
	input.multiple = allowMultiSelect;

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

	let loading = false;
	let cancelLoading: (()=>void)|null = null;
	const updateStatusText = () => {
		const files = selectedFiles.get();
		if (loading) {
			descriptionText.textContent = context.localization.fileInput__loading;
			if (cancelLoading) {
				const cancelText = document.createElement('b');
				cancelText.textContent = context.localization.cancel;
				cancelText.classList.add('cancel-button');
				descriptionText.appendChild(cancelText);
			}
			icon.style.display = 'none';
		} else if (files.length > 0) {
			descriptionText.textContent = files.map(file => file.name).join('\n');

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
					boldedText.textContent = segments[i];
					descriptionText.appendChild(boldedText);
				} else {
					descriptionText.appendChild(document.createTextNode(segments[i]));
				}
			}
		}
	};

	const addFileEventListeners = () => {
		// Support dropping files
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
			selectedFiles.set([...fileList]);
		});
	};

	addFileEventListeners();

	// Support for custom file pickers
	if (customPickerAction) {
		const promptForFiles = async () => {
			if (loading) {
				cancelLoading?.();
				return;
			}
			container.classList.add('-loading');
			loading = true;
			updateStatusText();

			try {
				const data = await customPickerAction({
					setOnCancelCallback: (onCancel) => {
						if (!loading) {
							throw new Error('Task already completed. Can\'t register cancel handler.');
						}

						cancelLoading = () => {
							cancelLoading = null;
							updateStatusText();
							onCancel();
						};
						updateStatusText();
					},
				});
				if (data) {
					selectedFiles.set(data);
				}
			} finally {
				container.classList.remove('-loading');
				loading = false;
				updateStatusText();
			}
		};
		input.onclick = promptForFiles;
	}

	selectedFiles.onUpdate(files => {
		if (files.length === 0 && input.files && input.files.length > 0) {
			input.value = '';
		}

		cancelLoading?.();
	});

	// Update the status text and hide/show the icon.
	selectedFiles.onUpdateAndNow(updateStatusText);

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
