import { Color4, TextComponent, TextRenderingStyle, AbstractComponent, AbstractRenderer, CanvasRenderer, Mat33, Path, Rect2, StrokeComponent, Vec2, Viewport, PathCommand, PathCommandType, pathToRenderable } from 'js-draw';
import { AnnotationMode, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

interface PDFPage {
	/**
	 * If the `PDFPage` can be rendered immediately, does so. Else,
	 * does nothing.
	 *
	 * Prepares the `PDFPage` for rendering within the given `viewport`
	 * if it is not already ready.
	 *
	 * See also `awaitRenderable`.
	 *
	 * @returns true if rendering was successful (if `false`, call `awaitRenderable` to
	 * prepare for rendering with the given `viewport`).
	 */
	render(renderer: AbstractRenderer, viewport: Rect2): boolean;

	/**
	 * Converts annotations associated with this page into components.
	 *
	 * @returns a list of `AbstractComponent`s corresponding to the annotations on this page.
	 */
	getAnnotations(): Promise<AbstractComponent[]>;

	/**
	 * Returns a `Promise` that resolves when the `PDFPage` first becomes
	 * renderable.
	 *
	 * Prepares the `PDFPage` for rendering if it is not already renderable.
	 */
	awaitRenderable(viewport: Rect2): Promise<void>;

	/** The bounding box of the `PDFPage`. */
	bbox: Rect2;
}

class PDFDocumentWrapper {
	private bbox: Rect2 = Rect2.empty;
	private geometryLoaded: boolean = false;

	/** The geometry of each page. */
	private pageRects: Rect2[] = [];

	/** References to each page */
	private pages: PDFPage[] = [];

	private pageLoadListeners: Array<()=>void> = [];

	private constructor(private pdf: PDFDocumentProxy) {
		this.loadPages();

		// TODO: REMOVE:
		(window as any).pdf = pdf;
	}

	public getPage(idx: number) {
		return this.pages[idx];
	}

	public get numPages() {
		return this.pages.length;
	}

	public async awaitPagesLoaded() {
		if (this.geometryLoaded) {
			return;
		}

		await new Promise<void>((resolve, _reject) => {
			this.pageLoadListeners.push(() => resolve());
		});
	}

	private async loadPages() {
		this.pageRects = [];
		this.pages = [];
		let totalY = 0;

		for (let pageIdx = 1; pageIdx <= this.pdf.numPages; pageIdx++) {
			const page = await this.pdf.getPage(pageIdx);

			const size = page.getViewport();

			// This stacks all pages on top of one another.
			// TODO: Support different layouts.
			const pageRect = new Rect2(
				size.viewBox[0],
				size.viewBox[1] + totalY,
				size.viewBox[2],
				size.viewBox[3]
			);
			totalY += pageRect.height;

			this.pageRects.push(pageRect);
			this.pages.push(PDFDocumentWrapper.buildPage(pageRect, page));

			this.bbox = this.bbox.union(pageRect);
		}

		this.pageLoadListeners.forEach(listener => listener());
		this.pageLoadListeners = [];
		this.geometryLoaded = true;
	}

	private static buildPage(bbox: Rect2, pdfPage: PDFPageProxy): PDFPage {
		// TODO: Use a kd tree (probably based on the RenderingCache built into js-draw).
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		// TODO: Don't assume that ctx != null.

		canvas.width = bbox.width;
		canvas.height = bbox.height;

		let rendered = false;
		let rendering = false;

		let awaitingRenderComplete: Array<()=>void> = [];

		const canvasRenderer = new CanvasRenderer(ctx, new Viewport(() => {}));
		let dataURL: string|undefined = undefined;

		const result = {
			render: (renderer: AbstractRenderer, viewport: Rect2) => {
				if (!rendered) {
					void result.awaitRenderable(viewport);
					return false;
				}

				// Translate the bounding box such that the PDF is drawn in the correct location
				const transform = Mat33.translation(bbox.topLeft);

				if (renderer.canRenderFromWithoutDataLoss(canvasRenderer)) {
					renderer.renderFromOtherOfSameType(transform, canvasRenderer);
				} else {
					dataURL ??= canvas.toDataURL('image/jpeg', 0.5);
					renderer.drawImage({
						transform,
						image: canvas,
						base64Url: dataURL
					});
				}

				return true;
			},

			awaitRenderable: async (_viewport: Rect2) => {
				if (rendered) return;

				if (rendering) {
					await new Promise<void>((resolve, _reject) => {
						awaitingRenderComplete.push(() => resolve());
					});

					return;
				}

				rendering = true;

				// TODO: Use viewport
				// For now, ignore `viewport` and render the entire page.

				const pageViewport = pdfPage.getViewport({ scale: 1, offsetX: 0, offsetY: 0, dontFlip: false });

				await pdfPage.render({
					canvasContext: ctx,
					viewport: pageViewport,

					// Annotations will be rendered separately.
					annotationMode: AnnotationMode.DISABLE,
				}).promise;

				rendered = true;
				rendering = false;

				awaitingRenderComplete.forEach(listener => listener());
				awaitingRenderComplete = [];
			},

			getAnnotations: async (): Promise<AbstractComponent[]> => {
				const pdfjsAnnotations = await pdfPage.getAnnotations({ intent: 'display' });

				// TODO: REMOVE!!! DEBUGGING!!!!!!
				const w = (window as any);
				if (pdfjsAnnotations.filter(a => (a.subtype !== 'Link' && a.subtype !== 'FreeText')).length > 0) {
					w.lannot = w.annots;
					w.annots = pdfjsAnnotations;
				}
				// END REMOVE

				const annotations = [];

				for (const annotation of pdfjsAnnotations) {
					if (annotation.subtype !== 'Ink' && annotation.subtype !== 'FreeText') {
						if (annotation.subtype !== 'Link') {
							console.warn('Unknown annotation type: ' + annotation.subtype);
						}
						continue;
					}

					let rect = new Rect2(
						annotation.rect[0],
						bbox.height - annotation.rect[1],
						annotation.rect[2],
						annotation.rect[3]);
					rect = rect.translatedBy(bbox.topLeft);

					if (annotation.subtype === 'Ink') {
						const pdfjsInkList = annotation.inkLists as { x: number, y: number }[][];
						const transform = Mat33.translation(rect.topLeft).rightMul(Mat33.scaling2D(Vec2.of(1, -1)));

						const color = annotation.color ? Color4.fromArray(annotation.color) : Color4.black;
						const strokeStyle = { color: color, width: annotation.borderStyle?.width ?? 1 };
						const renderStyle = { fill: Color4.transparent, stroke: strokeStyle };

						for (const inkPart of pdfjsInkList) {
							const points = inkPart.map(point => Vec2.ofXY(point));
							points.reverse();
							if (points.length === 0) continue;

							const pathCommands: PathCommand[] = [];

							let i = 0;
							for (i = 1; i < points.length; i += 2) {
								pathCommands.push({
									kind: PathCommandType.QuadraticBezierTo,
									//controlPoint1: points[i - 2],
									controlPoint: points[i - 1],
									endPoint: points[i],
								});
							}

							if (i < points.length - 2) {
								pathCommands.push({
									kind: PathCommandType.QuadraticBezierTo,
									controlPoint: points[points.length - 2],
									endPoint: points[points.length - 1],
								});
							} else if (i < points.length - 1) {
								pathCommands.push({
									kind: PathCommandType.LineTo,
									point: points[points.length - 1],
								});
							}


							const path = new Path(points[0], pathCommands).transformedBy(transform);
							const strokePart = pathToRenderable(path, renderStyle);
							annotations.push(new StrokeComponent([ strokePart ]));
						}
					} else if (annotation.subtype === 'FreeText') {
						type ContentType = { str: string, dir: string };
						const content = annotation.contentsObj as ContentType;

						type AppearanceType = { fontSize: number, fontName: string, fontColor: Uint8ClampedArray };
						const pdfJsAppearance = annotation.defaultAppearanceData as AppearanceType;

						// TODO: Use content.dir to handle right-to-left support
						const style: TextRenderingStyle = {
							size: pdfJsAppearance.fontSize,
							fontFamily: pdfJsAppearance.fontName,

							renderingStyle: {
								fill: Color4.fromArray(pdfJsAppearance.fontColor),
							}
						};

						const transform = Mat33.translation(rect.topLeft);
						annotations.push(new TextComponent([ content.str ], transform, style));
					}
				}

				return annotations as AbstractComponent[];
			},

			bbox,
		};
		return result;
	}

	/** Returns `true` if this PDF's full geometry has been loaded. */
	public isGeometryLoaded(): boolean {
		return this.geometryLoaded;
	}

	/**
	 * Returns the bounding box of the entire PDF. If `!isGeometryLoaded()`, then
	 * this may return the empty rectangle.
	 */
	public getBBox() {
		return this.bbox;
	}

	/**
	 * Create a new `PDFDocumentWrapper` from a [pdfjs `pdf`](https://github.com/mozilla/pdf.js).
	 */
	public static fromPDFJS(pdf: PDFDocumentProxy) {
		return new PDFDocumentWrapper(pdf);
	}
}

export default PDFDocumentWrapper;
