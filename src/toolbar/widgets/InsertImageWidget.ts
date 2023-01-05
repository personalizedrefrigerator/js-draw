import ImageComponent from '../../components/ImageComponent';
import Editor from '../../Editor';
import Mat33 from '../../math/Mat33';
import fileToBase64 from '../../util/fileToBase64';
import { ToolbarLocalization } from '../localization';
import ActionButtonWidget from './ActionButtonWidget';

export default class InsertImageWidget extends ActionButtonWidget {
	private imageSelectionOverlay: HTMLElement;
	private imagePreview: HTMLImageElement;
	private imageFileInput: HTMLInputElement;
	private imageAltTextInput: HTMLInputElement;
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
		this.fillOverlay();

		this.editor.createHTMLOverlay(this.imageSelectionOverlay);
		this.imageSelectionOverlay.style.display = 'none';
	}

	private static nextInputId = 0;

	private fillOverlay() {
		const chooseImageRow = document.createElement('div');
		const altTextRow = document.createElement('div');
		this.imagePreview = document.createElement('img');
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

		chooseImageRow.replaceChildren(imageFileInputLabel, this.imageFileInput);
		altTextRow.replaceChildren(imageAltTextLabel, this.imageAltTextInput);
		actionButtonsRow.replaceChildren(cancelButton, this.submitButton);

		this.imageSelectionOverlay.replaceChildren(
			chooseImageRow, altTextRow, this.imagePreview, actionButtonsRow
		);

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

			const data = await fileToBase64(image);
			if (data) {
				this.imagePreview.src = data;
				this.submitButton.disabled = false;
			} else {
				this.submitButton.disabled = true;
			}

			this.imageBase64URL = data;
		};

		cancelButton.onclick = () => {
			this.imageSelectionOverlay.style.display = 'none';
		};
	}

	private clearInputs() {
		this.imageFileInput.value = '';
		this.imageAltTextInput.value = '';
		this.imagePreview.style.display = 'none';
		this.submitButton.disabled = true;
	}

	private onClicked() {
		this.imageSelectionOverlay.style.display = 'block';
		this.clearInputs();

		// TODO: Replace selected image with something else if there is a selected image.

		this.submitButton.onclick = async () => {
			if (!this.imageBase64URL) {
				return;
			}
			this.imageSelectionOverlay.style.display = 'none';

			const image = new Image();
			image.src = this.imageBase64URL;
			image.setAttribute('alt', this.imageAltTextInput.value);

			const component = await ImageComponent.fromImage(image, Mat33.identity);
			await this.editor.addAndCenterComponents([ component ]);
		};
	}
}