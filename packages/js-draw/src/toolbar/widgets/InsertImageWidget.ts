import ImageComponent from '../../components/ImageComponent';
import Editor from '../../Editor';
import Erase from '../../commands/Erase';
import EditorImage from '../../image/EditorImage';
import uniteCommands from '../../commands/uniteCommands';
import SelectionTool from '../../tools/SelectionTool/SelectionTool';
import { Mat33 } from '@js-draw/math';
import fileToBase64 from '../../util/fileToBase64';
import { ToolbarLocalization } from '../localization';
import BaseWidget from './BaseWidget';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../constants';
import makeFileInput from './components/makeFileInput';
import { MutableReactiveValue } from '../../util/ReactiveValue';

class ImageWrapper {
	private readonly originalSrc: string;

	private constructor(
		private imageBase64Url: string,
		private preview: HTMLImageElement,
		private onUrlUpdate: ()=>void,
	) {
		this.originalSrc = imageBase64Url;
		preview.src = imageBase64Url;
	}

	private updateImageData(base64DataUrl: string) {
		this.preview.src = base64DataUrl;
		this.imageBase64Url = base64DataUrl;
		this.onUrlUpdate();
	}

	public decreaseSize(resizeFactor: number = 3/4) {
		const canvas = document.createElement('canvas');

		canvas.width = this.preview.naturalWidth * resizeFactor;
		canvas.height = this.preview.naturalHeight * resizeFactor;

		const ctx = canvas.getContext('2d');
		ctx?.drawImage(this.preview, 0, 0, canvas.width, canvas.height);

		// JPEG can be much smaller than PNG for the same image size. Prefer it if
		// the image is already a JPEG.
		const format =
			this.originalSrc?.startsWith('data:image/jpeg;') ? 'image/jpeg' : 'image/png';
		this.updateImageData(canvas.toDataURL(format));
	}

	public reset() {
		this.updateImageData(this.originalSrc);
	}

	public isChanged() {
		return this.imageBase64Url !== this.originalSrc;
	}

	public getBase64Url() {
		return this.imageBase64Url;
	}

	public static fromSrcAndPreview(
		initialBase64Src: string,
		preview: HTMLImageElement,
		onUrlUpdate: ()=>void,
	) {
		return new ImageWrapper(initialBase64Src, preview, onUrlUpdate);
	}
}

export default class InsertImageWidget extends BaseWidget {
	private imagePreview: HTMLImageElement;
	private image: ImageWrapper|null = null;

	private selectedFiles: MutableReactiveValue<File[]>|null;
	private imageAltTextInput: HTMLInputElement;
	private statusView: HTMLElement;
	private submitButton: HTMLButtonElement;

	public constructor(editor: Editor, localization?: ToolbarLocalization) {
		localization ??= editor.localization;

		super(editor, 'insert-image-widget', localization);

		// Make the dropdown showable
		this.container.classList.add('dropdownShowable');

		editor.notifier.on(EditorEventType.SelectionUpdated, event => {
			if (event.kind === EditorEventType.SelectionUpdated && this.isDropdownVisible()) {
				this.updateInputs();
			}
		});
	}

	protected override getTitle(): string {
		return this.localizationTable.image;
	}

	protected override createIcon(): Element | null {
		return this.editor.icons.makeInsertImageIcon();
	}

	protected override setDropdownVisible(visible: boolean): void {
		super.setDropdownVisible(visible);

		// Update the dropdown just before showing.
		if (this.isDropdownVisible()) {
			this.updateInputs();
		}
	}

	protected override handleClick() {
		this.setDropdownVisible(!this.isDropdownVisible());
	}

	private static nextInputId = 0;

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add(
			'insert-image-widget-dropdown-content',
			`${toolbarCSSPrefix}spacedList`,
			`${toolbarCSSPrefix}nonbutton-controls-main-list`,
		);

		const {
			container: chooseImageRow,
			selectedFiles,
		} = makeFileInput(
			this.localizationTable.chooseFile,
			this.editor,
			'image/*',
		);
		const altTextRow = document.createElement('div');
		this.imagePreview = document.createElement('img');
		this.statusView = document.createElement('div');
		const actionButtonRow = document.createElement('div');

		actionButtonRow.classList.add('action-button-row');
		this.statusView.classList.add('insert-image-image-status-view');

		this.submitButton = document.createElement('button');
		this.selectedFiles = selectedFiles;
		this.imageAltTextInput = document.createElement('input');

		// Label the alt text input
		const imageAltTextLabel = document.createElement('label');

		const altTextInputId = `insert-image-alt-text-input-${InsertImageWidget.nextInputId++}`;
		this.imageAltTextInput.setAttribute('id', altTextInputId);
		imageAltTextLabel.htmlFor = altTextInputId;

		imageAltTextLabel.innerText = this.localizationTable.inputAltText;
		this.imageAltTextInput.type = 'text';

		this.statusView.setAttribute('aria-live', 'polite');

		this.submitButton.innerText = this.localizationTable.submit;

		this.selectedFiles.onUpdateAndNow(async files => {
			if (files.length === 0) {
				this.image = null;
				this.onImageDataUpdate();
				return;
			}

			this.imagePreview.style.display = 'block';

			const image = files[0];

			let data: string|null = null;

			try {
				data = await fileToBase64(image);
			} catch(e) {
				this.statusView.innerText = this.localizationTable.imageLoadError(e);
			}

			if (data) {
				this.image = ImageWrapper.fromSrcAndPreview(
					data, this.imagePreview, () => this.onImageDataUpdate(),
				);
			} else {
				this.image = null;
			}
			this.onImageDataUpdate();
		});

		altTextRow.replaceChildren(imageAltTextLabel, this.imageAltTextInput);
		actionButtonRow.replaceChildren(this.submitButton);

		container.replaceChildren(
			chooseImageRow, altTextRow, this.imagePreview, this.statusView, actionButtonRow
		);

		dropdown.replaceChildren(container);
		return true;
	}

	private onImageDataUpdate() {
		const base64Data = this.image?.getBase64Url();

		if (base64Data) {
			this.submitButton.disabled = false;
			this.submitButton.style.display = '';
			this.imagePreview.style.display = '';
			this.updateImageSizeDisplay();
		} else {
			this.submitButton.disabled = true;
			this.submitButton.style.display = 'none';
			this.statusView.innerText = '';
			this.imagePreview.style.display = 'none';
			this.submitButton.disabled = true;
		}
	}

	private hideDialog() {
		this.setDropdownVisible(false);
	}

	private updateImageSizeDisplay() {
		const imageData = this.image?.getBase64Url() ?? '';

		const sizeInKiB = imageData.length / 1024;
		const sizeInMiB = sizeInKiB / 1024;

		let units = 'KiB';
		let size = sizeInKiB;

		if (sizeInMiB >= 1) {
			size = sizeInMiB;
			units = 'MiB';
		}

		const sizeText = document.createElement('span');
		sizeText.innerText = this.localizationTable.imageSize(
			Math.round(size), units
		);

		// Add a button to allow decreasing the size of large images.
		const decreaseSizeButton = document.createElement('button');
		decreaseSizeButton.innerText = this.localizationTable.decreaseImageSize;
		decreaseSizeButton.onclick = () => {
			this.image?.decreaseSize();
		};

		const resetSizeButton = document.createElement('button');
		resetSizeButton.innerText = this.localizationTable.resetImage;
		resetSizeButton.onclick = () => {
			this.image?.reset();
		};

		this.statusView.replaceChildren(sizeText);

		const largeImageThreshold = 0.25; // MiB
		if (sizeInMiB > largeImageThreshold) {
			this.statusView.appendChild(decreaseSizeButton);
		} else if (this.image?.isChanged()) {
			this.statusView.appendChild(resetSizeButton);
		}
	}

	private updateInputs() {
		const resetInputs = () => {
			this.selectedFiles?.set([]);
			this.imageAltTextInput.value = '';
			this.imagePreview.style.display = 'none';
			this.submitButton.disabled = true;
			this.statusView.innerText = '';

			this.submitButton.style.display = '';

			this.imageAltTextInput.oninput = null;
		};
		resetInputs();

		const selectionTools = this.editor.toolController.getMatchingTools(SelectionTool);
		const selectedObjects = selectionTools.map(tool => tool.getSelectedObjects()).flat();

		// Check: Is there a selected image that can be edited?
		let editingImage: ImageComponent|null = null;
		if (selectedObjects.length === 1 && selectedObjects[0] instanceof ImageComponent) {
			editingImage = selectedObjects[0];

			this.imageAltTextInput.value = editingImage.getAltText() ?? '';
			this.image = ImageWrapper.fromSrcAndPreview(
				editingImage.getURL(),
				this.imagePreview,
				() => this.onImageDataUpdate(),
			);

			this.onImageDataUpdate();
		} else if (selectedObjects.length > 0) {
			// If not, clear the selection.
			selectionTools.forEach(tool => tool.clearSelection());
		}

		// Show the submit button only when there is data to submit.
		this.submitButton.style.display = 'none';
		this.imageAltTextInput.oninput = () => {
			if (this.imagePreview.src?.length > 0) {
				this.submitButton.style.display = '';
			}
		};

		this.submitButton.onclick = async () => {
			if (!this.image) {
				return;
			}

			const image = new Image();
			image.src = this.image.getBase64Url();
			image.setAttribute('alt', this.imageAltTextInput.value);

			const component = await ImageComponent.fromImage(image, Mat33.identity);

			if (component.getBBox().area === 0) {
				this.statusView.innerText = this.localizationTable.errorImageHasZeroSize;
				return;
			}

			this.hideDialog();

			if (editingImage) {
				const eraseCommand = new Erase([ editingImage ]);

				// Try to preserve the original width
				const originalTransform = editingImage.getTransformation();
				const originalWidth = editingImage.getBBox().width || 1;
				const newWidth = component.getBBox().transformedBoundingBox(originalTransform).width || 1;
				const widthAdjustTransform = Mat33.scaling2D(originalWidth / newWidth);

				await this.editor.dispatch(uniteCommands([
					EditorImage.addElement(component),
					component.transformBy(originalTransform.rightMul(widthAdjustTransform)),
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
