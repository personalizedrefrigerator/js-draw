import { Mat33Array, Rect2, Mat33, LineSegment2, Path, Color4 } from '@js-draw/math';
import AbstractRenderer, { RenderableImage } from '../rendering/renderers/AbstractRenderer';
import { assertIsNumber, assertIsNumberArray } from '../util/assertions';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';
import waitForImageLoaded from '../util/waitForImageLoaded';
import Viewport from '../Viewport';
import Stroke from './Stroke';
import { pathToRenderable } from '../rendering/RenderablePathSpec';

/**
 * Represents a raster image.
 *
 * **Example: Adding images**:
 * [[include:doc-pages/inline-examples/adding-an-image-and-data-urls.md]]
 */
export default class ImageComponent extends AbstractComponent {
	protected contentBBox: Rect2;
	private image: RenderableImage;
	private mask: Stroke[]|null = null;

	public constructor(image: RenderableImage) {
		super('image-component');
		this.image = {
			...image,
			label: image.label ?? image.image.getAttribute('alt') ?? image.image.getAttribute('aria-label') ?? undefined,
		};

		const isHTMLImageElem = (elem: HTMLCanvasElement|HTMLImageElement): elem is HTMLImageElement => {
			return elem.getAttribute('src') !== undefined;
		};
		if (isHTMLImageElem(image.image) && !image.image.complete) {
			image.image.onload = () => this.recomputeBBox();
		}

		this.recomputeBBox();
	}

	private getImageRect() {
		return new Rect2(0, 0, this.image.image.width, this.image.image.height);
	}

	private recomputeBBox() {
		this.contentBBox = this.getImageRect();
		this.contentBBox = this.contentBBox.transformedBoundingBox(this.image.transform);
	}

	public override withRegionErased(eraserPath: Path, viewport: Viewport) {
		let mask = this.mask ?? [new Stroke([
			pathToRenderable(Path.fromRect(this.contentBBox), { fill: Color4.transparent }),
		])];
		mask = mask.flatMap(part => part.withRegionErased(eraserPath, viewport));

		const result = new ImageComponent(this.image);
		result.mask = mask;
		return [ result ];
	}

	/**
	 * Load from an image. Waits for the image to load if incomplete.
	 *
	 * The image, `elem`, must not [taint](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image#security_and_tainted_canvases)
	 * an HTMLCanvasElement when rendered.
	 */
	public static async fromImage(elem: HTMLImageElement, transform: Mat33) {
		await waitForImageLoaded(elem);

		let width, height;
		if (
			typeof elem.width === 'number' && typeof elem.height === 'number'
			&& elem.width !== 0 && elem.height !== 0
		) {
			width = elem.width;
			height = elem.height;
		} else {
			width = elem.clientWidth;
			height = elem.clientHeight;
		}

		let image;
		let url = elem.src ?? '';
		if (!url.startsWith('data:image/')) {
			// Convert to a data URL:
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(elem, 0, 0, canvas.width, canvas.height);
			url = canvas.toDataURL();
			image = canvas;
		} else {
			image = new Image();
			image.src = url;
			image.width = width;
			image.height = height;
		}

		image.setAttribute('alt', elem.getAttribute('alt') ?? '');
		image.setAttribute('aria-label', elem.getAttribute('aria-label') ?? '');

		return new ImageComponent({
			image,
			base64Url: url,
			transform: transform,
		});
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);
		const clipPath = this.mask?.reduce((union: Path|undefined, item) => {
			const path = item.getPath();
			if (union) {
				union = union.union(path);
			}
			return union ?? path;
		}, undefined);
		canvas.drawImage(this.image, clipPath);
		canvas.endObject(this.getLoadSaveData());
	}

	// A *very* rough estimate of how long it takes to render this component
	public override getProportionalRenderingTime(): number {
		// Estimate: Equivalent to a stroke with 10 segments.
		return 10;
	}

	public override intersects(lineSegment: LineSegment2): boolean {
		const rect = this.getImageRect();
		const edges = rect.getEdges().map(edge => edge.transformedBy(this.image.transform));
		for (const edge of edges) {
			if (edge.intersects(lineSegment)) {
				return true;
			}
		}
		return false;
	}

	protected applyTransformation(affineTransfm: Mat33) {
		this.image.transform = affineTransfm.rightMul(this.image.transform);
		this.recomputeBBox();
	}

	public override description(localizationTable: ImageComponentLocalization): string {
		return this.image.label ? localizationTable.imageNode(this.image.label) : localizationTable.unlabeledImageNode;
	}

	public getAltText() {
		return this.image.label;
	}

	// The base64 image URL of this image.
	public getURL() {
		return this.image.base64Url;
	}

	public getTransformation(): Mat33 {
		return this.image.transform;
	}

	protected override createClone(): AbstractComponent {
		return new ImageComponent({
			...this.image,
		});
	}

	protected override serializeToJSON() {
		return {
			src: this.image.base64Url,
			label: this.image.label,

			// Store the width and height for bounding box computations while the image is loading.
			width: this.image.image.width,
			height: this.image.image.height,

			transform: this.image.transform.toArray(),
		};
	}

	public static deserializeFromJSON(this: void, data: any): ImageComponent {
		if (!(typeof data.src === 'string')) {
			throw new Error(`${data} has invalid format! Expected src property.`);
		}

		assertIsNumberArray(data.transform);
		assertIsNumber(data.width);
		assertIsNumber(data.height);

		const image = new Image();
		image.src = data.src;
		image.width = data.width;
		image.height = data.height;

		const transform = new Mat33(...(data.transform as Mat33Array));

		return new ImageComponent({
			image: image,
			base64Url: data.src,
			label: data.label,
			transform,
		});
	}
}

AbstractComponent.registerComponent('image-component', ImageComponent.deserializeFromJSON);
