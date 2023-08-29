import { AbstractComponent, AbstractRenderer, Color4, EditorImage, LineSegment2, Mat33, Rect2 } from 'js-draw';
import PDFDocumentWrapper from './PDFDocumentWrapper';

// immutable
class PDFBackground extends AbstractComponent {
	protected override contentBBox: Rect2;

	/** List of page regions, sorted in vertical ascending order. */
	private containerImage?: EditorImage;

	public constructor(private pdf: PDFDocumentWrapper) {
		super('pdf-background');
		console.log('pdfbg');
		this.contentBBox = Rect2.empty;
		void this.recomputeBBox();
	}

	public override onAddToImage(image: EditorImage) {
		this.containerImage = image;
		void this.recomputeBBox();
	}

	/** Recomputes the PDF's bounding box and the regions of each of the pages. */
	private async recomputeBBox() {
		// Wait for the geometry to load.
		await this.pdf.awaitPagesLoaded();
		const bbox = this.pdf.getBBox();

		if (!this.contentBBox.eq(bbox)) {
			console.log('update bbox', bbox);
			this.contentBBox = bbox;
			this.containerImage?.queueRerenderOf(this);
		}
	}

	public override isSelectable(): boolean {
		return false;
	}

	public override isBackground(): boolean {
		return true;
	}

	public override render(canvas: AbstractRenderer, visibleRect?: Rect2 | undefined) {
		console.log('render');
		for (let i = 0; i < this.pdf.numPages; i ++) {
			const page = this.pdf.getPage(i);

			if (!visibleRect || page.bbox.intersects(visibleRect)) {
				canvas.drawRect(page.bbox, 2, { fill: Color4.red });

				// TODO: page.bbox is an approximation.
				const renderRect = visibleRect ?? page.bbox;

				const rendered = page.render(canvas, renderRect);

				if (!rendered) {
					page.awaitRenderable(renderRect).then(() => {
						this.containerImage?.queueRerenderOf(this);
					});
				}
			}
		}
	}

	override intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.getEdges()
			.some(segment => segment.intersects(lineSegment));
	}

	protected override applyTransformation(_affineTransfm: Mat33) {
		console.warn('Attempt to transform a background');
	}

	override description(): string {
		// TODO: description
		return 'To-do!';
	}

	protected override createClone(): AbstractComponent {
		// PDFBackgrounds are immutable.
		return this;
	}


	protected override serializeToJSON() {
		// Return null: For now, assume that PDFs cannot be safely deserialized.
		return null;
	}
}

AbstractComponent.registerComponent('pdf-background', () => {
	throw new Error('PDF backgrounds are not deserializable.');
});

export default PDFBackground;
