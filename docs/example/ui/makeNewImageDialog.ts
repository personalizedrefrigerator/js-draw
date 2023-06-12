import templates from '../imageTemplates';
import { Localization } from '../localization';
import AbstractStore, { StoreEntry } from '../storage/AbstractStore';
import makeReadOnlyStoreEntry from '../storage/makeReadOnlyStoreEntry';
import './newImageDialog.css';

const makeNewImageDialog = (
	localization: Localization,
	store: AbstractStore
): Promise<StoreEntry|null> => {
	let dialogResult: StoreEntry|null|undefined = undefined;

	let closeDialogWithResult = (result: StoreEntry|null) => {
		dialogResult = result;
	};

	const closeDialogWithStringResult = async (result: string) => {
		const onInvalidOperation = () => {
			alert('Warning: Not saved.');
		};

		let item: StoreEntry|null = await store.createNewEntry();
		if (item === null) {
			item = makeReadOnlyStoreEntry(result, onInvalidOperation);
		} else {
			// Set the initial content of the item.
			await item.write(result);
		}

		closeDialogWithResult(item);
	};

	const background = document.createElement('div');
	background.classList.add('new-image-dialog-background');

	const container = document.createElement('div');
	container.classList.add('new-image-dialog');

	const titleElem = document.createElement('h2');
	titleElem.innerText = localization.newImageHeading;

	const makeCreationOption = (title: string) => {
		const fieldset = document.createElement('fieldset');
		const legend = document.createElement('legend');
		legend.appendChild(document.createTextNode(title));

		fieldset.appendChild(legend);
		return fieldset;
	};

	const fromFileArea = makeCreationOption('From file');
	const fromTemplateArea = makeCreationOption('From template');

	fromTemplateArea.classList.add('from-template-container');

	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fromFileArea.appendChild(fileInput);

	// Danger: svgData is not sanitized!
	const addTemplateOption = (title: string, svgData: string) => {
		const templateButton = document.createElement('button');
		templateButton.classList.add('new-image-template-button');

		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		icon.innerHTML = svgData;
		const label = document.createElement('div');
		label.innerText = title;

		templateButton.onclick = () => {
			closeDialogWithStringResult(svgData);
		};

		templateButton.replaceChildren(icon, label);
		fromTemplateArea.appendChild(templateButton);
	};

	addTemplateOption('Light Grid', templates.lightGrid);
	addTemplateOption('Dark Grid', templates.darkGrid);

	container.replaceChildren(titleElem, fromTemplateArea, fromFileArea);
	background.appendChild(container);
	document.body.appendChild(background);

	// Handle file uploads.
	fileInput.onchange = () => {
		const files = fileInput.files ?? [];

		if (files.length > 1) {
			alert('Too many files!');
			return;
		}
		if (files.length === 0) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (progress => {
			if (progress.target?.result) {
				// The reader was started with .readAsText, so we know [result]
				// is a string.
				closeDialogWithStringResult(progress.target.result as string);
			}
		});
		reader.readAsText(files[0]);
	};

	background.onclick = (event) => {
		if (event.target === background) {
			closeDialogWithResult(null);
		}
	};

	return new Promise<StoreEntry|null>((resolve, _reject) => {
		if (dialogResult !== undefined) {
			background.remove();
			resolve(dialogResult);
		}

		closeDialogWithResult = (result: StoreEntry|null) => {
			background.remove();
			resolve(result);
		};
	});
};

export default makeNewImageDialog;
