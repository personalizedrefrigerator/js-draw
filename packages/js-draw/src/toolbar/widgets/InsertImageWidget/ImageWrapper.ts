import { RenderableImage } from 'js-draw/src/rendering/renderers/AbstractRenderer';

/** Handles filtering and other operations on an image. */
export class ImageWrapper {
	private readonly originalSrc: string;
	private altText: string;

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

	// Returns true if the current image is large enough to display a "decrease size"
	// option.
	public isLarge() {
		const largeImageThreshold = 0.12 * 1024 * 1024; // 0.12 MiB
		return this.getBase64Url().length > largeImageThreshold;
	}

	public getBase64Url() {
		return this.imageBase64Url;
	}

	public getAltText() {
		return this.altText;
	}

	public setAltText(text: string) {
		this.altText = text;
		this.preview.alt = text;
	}

	public static fromSrcAndPreview(
		initialBase64Src: string,
		preview: HTMLImageElement,
		onUrlUpdate: ()=>void,
	) {
		return new ImageWrapper(initialBase64Src, preview, onUrlUpdate);
	}

	public static fromRenderable(
		renderable: RenderableImage,
		onUrlUpdate: ()=>void,
	) {
		const preview = new Image();
		preview.src = renderable.base64Url;
		const result = new ImageWrapper(renderable.base64Url, preview, onUrlUpdate);

		const altText = renderable.label ?? renderable.image.getAttribute('alt');
		if (altText) {
			result.setAltText(altText);
		}

		return { wrapper: result, preview };
	}
}
