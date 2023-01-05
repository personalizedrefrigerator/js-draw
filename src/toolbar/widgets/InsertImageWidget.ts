import ImageComponent from '../../components/ImageComponent';
import Editor from '../../Editor';
import Erase from '../../commands/Erase';
import EditorImage from '../../EditorImage';
import { SelectionTool, uniteCommands } from '../../lib';
import Mat33 from '../../math/Mat33';
import fileToBase64 from '../../util/fileToBase64';
import { ToolbarLocalization } from '../localization';
import ActionButtonWidget from './ActionButtonWidget';

export default class InsertImageWidget extends ActionButtonWidget {
	private imageSelectionOverlay: HTMLElement;
	private imagePreview: HTMLImageElement;
	private imageFileInput: HTMLInputElement;
	private imageAltTextInput: HTMLInputElement;
	private statusView: HTMLElement;
	private imageBase64URL: string|null;
	private submitButton: HTMLButtonElement;

	public constructor(editor: Editor, localization?: ToolbarLocalization) {
		localization ??= editor.localization;

		super(editor,
			'insert-image-widget',
			() => editor.icons.makeInsertImageIcon(),
			localization.image,
			() => this.onClicked()
		);

		this.imageSelectionOverlay = document.createElement('div');
		this.imageSelectionOverlay.classList.add('toolbar-image-selection-overlay');
		this.fillOverlay();

		this.editor.createHTMLOverlay(this.imageSelectionOverlay);
		this.imageSelectionOverlay.style.display = 'none';
	}

	private static nextInputId = 0;

	private fillOverlay() {
		const container = document.createElement('div');

		const chooseImageRow = document.createElement('div');
		const altTextRow = document.createElement('div');
		this.imagePreview = document.createElement('img');
		this.statusView = document.createElement('div');
		const actionButtonsRow = document.createElement('div');

		this.submitButton = document.createElement('button');
		const cancelButton = document.createElement('button');

		this.imageFileInput = document.createElement('input');
		this.imageAltTextInput = document.createElement('input');
		const imageFileInputLabel = document.createElement('label');
		const imageAltTextLabel = document.createElement('label');

		const fileInputId = `insert-image-file-input-${InsertImageWidget.nextInputId ++}`;
		const altTextInputId = `insert-image-alt-text-input-${InsertImageWidget.nextInputId++}`;

		this.imageFileInput.setAttribute('id', fileInputId);
		this.imageAltTextInput.setAttribute('id', altTextInputId);
		imageAltTextLabel.htmlFor = altTextInputId;
		imageFileInputLabel.htmlFor = fileInputId;

		imageAltTextLabel.innerText = this.localizationTable.inputAltText;
		imageFileInputLabel.innerText = this.localizationTable.chooseFile;

		this.imageFileInput.type = 'file';
		this.imageAltTextInput.type = 'text';

		this.statusView.setAttribute('aria-live', 'polite');

		cancelButton.innerText = this.localizationTable.cancel;
		this.submitButton.innerText = this.localizationTable.submit;

		this.imageFileInput.onchange = async () => {
			if (this.imageFileInput.value === '' || !this.imageFileInput.files || !this.imageFileInput.files[0]) {
				this.imagePreview.style.display = 'none';
				this.submitButton.disabled = true;
				return;
			}

			this.imagePreview.style.display = 'block';

			const image = this.imageFileInput.files[0];

			let data: string|null = null;

			try {
				data = await fileToBase64(image);
			} catch(e) {
				this.statusView.innerText = this.localizationTable.imageLoadError(e);
			}

			this.imageBase64URL = data;

			if (data) {
				this.imagePreview.src = data;
				this.submitButton.disabled = false;
				this.updateImageSizeDisplay();
			} else {
				this.submitButton.disabled = true;
				this.statusView.innerText = '';
			}
		};

		cancelButton.onclick = () => {
			this.imageSelectionOverlay.style.display = 'none';
		};

		chooseImageRow.replaceChildren(imageFileInputLabel, this.imageFileInput);
		altTextRow.replaceChildren(imageAltTextLabel, this.imageAltTextInput);
		actionButtonsRow.replaceChildren(cancelButton, this.submitButton);

		container.replaceChildren(
			chooseImageRow, altTextRow, this.imagePreview, this.statusView, actionButtonsRow
		);

		this.imageSelectionOverlay.replaceChildren(container);
	}

	private updateImageSizeDisplay() {
		const imageData = this.imageBase64URL ?? '';
		this.statusView.innerText = this.localizationTable.imageSize(
			Math.round(imageData.length / 1024), 'KiB'
		);
	}

	private clearInputs() {
		this.imageFileInput.value = '';
		this.imageAltTextInput.value = '';
		this.imagePreview.style.display = 'none';
		this.submitButton.disabled = true;
		this.statusView.innerText = '';
	}

	private onClicked() {
		this.imageSelectionOverlay.style.display = '';
		this.clearInputs();
		this.imageFileInput.focus();

		const selectionTools = this.editor.toolController.getMatchingTools(SelectionTool);
		const selectedObjects = selectionTools.map(tool => tool.getSelectedObjects()).flat();

		let editingImage: ImageComponent|null = null;
		if (selectedObjects.length === 1 && selectedObjects[0] instanceof ImageComponent) {
			editingImage = selectedObjects[0];

			this.imageAltTextInput.value = editingImage.getAltText() ?? '';
			this.imagePreview.style.display = 'block';
			this.submitButton.disabled = false;

			this.imageBase64URL = editingImage.getURL();
			this.imagePreview.src = this.imageBase64URL;

			this.updateImageSizeDisplay();
		} else {
			selectionTools.forEach(tool => tool.clearSelection());
		}

		this.submitButton.onclick = async () => {
			if (!this.imageBase64URL) {
				return;
			}
			this.imageSelectionOverlay.style.display = 'none';

			const image = new Image();
			image.src = this.imageBase64URL;
			image.setAttribute('alt', this.imageAltTextInput.value);

			const component = await ImageComponent.fromImage(image, Mat33.identity);

			if (editingImage) {
				const eraseCommand = new Erase([ editingImage ]);

				await this.editor.dispatch(uniteCommands([
					EditorImage.addElement(component),
					component.transformBy(editingImage.getTransformation()),
					component.setZIndex(editingImage.getZIndex()),
					eraseCommand,
				]));

				selectionTools[0]?.setSelection([ component ]);
			} else {
				await this.editor.addAndCenterComponents([ component ]);
			}
		};
	}
}