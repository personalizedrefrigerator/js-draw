import {
	TextComponent,
	TextRenderingStyle,
	AbstractComponent,
	AbstractRenderer,
	CanvasRenderer,
	StrokeComponent,
	Viewport,
	pathToRenderable,
	EditorImage,
} from 'js-draw';
import {
	Color4,
	Mat33,
	Path,
	Rect2,
	Vec2,
	PathCommand,
	PathCommandType,
	Point2,
} from '@js-draw/math';
import APIWrapper, { AnnotationAPIWrapper, AnnotationType, PageAPIWrapper } from './APIWrapper';

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
	 * Replaces annotations that were previously loaded with `getAnnotations`
	 * with the given `annotations`.
	 */
	updateAnnotations(annotations: AbstractComponent[]): Promise<void>;

	/**
	 * Returns a `Promise` that resolves when the `PDFPage` first becomes
	 * renderable.
	 *
	 * Prepares the `PDFPage` for rendering if it is not already renderable.
	 */
	awaitRenderable(viewport: Rect2, scale: number): Promise<void>;

	/** The bounding box of the `PDFPage`. */
	bbox: Rect2;
}

type PDFLoadSaveData = {
	id: string;
};

class PDFDocumentWrapper {
	private bbox: Rect2 = Rect2.empty;
	private geometryLoaded: boolean = false;

	/** The geometry of each page. */
	private pageRects: Rect2[] = [];

	/** References to each page */
	private pages: PDFPage[] = [];

	private pageLoadListeners: Array<() => void> = [];

	private constructor(private pdf: APIWrapper) {
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

		const pageCount = this.pdf.pageCount();
		for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
			const page = await this.pdf.loadPage(pageIdx);

			const bbox = page.getBBox();

			// This stacks all pages on top of one another.
			// TODO: Support different layouts.
			const pageRect = (await bbox).translatedBy(Vec2.of(0, totalY));
			totalY += pageRect.height;

			this.pageRects.push(pageRect);
			this.pages.push(this.buildPage(pageRect, page));

			this.bbox = this.bbox.union(pageRect);
		}

		this.pageLoadListeners.forEach((listener) => listener());
		this.pageLoadListeners = [];
		this.geometryLoaded = true;
	}

	private buildPage(pageBBox: Rect2, pdfPage: PageAPIWrapper): PDFPage {
		// TODO: Use a kd tree (probably based on the RenderingCache built into js-draw).
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		// TODO: Don't assume that ctx != null.
		let lastScale = 1;

		let rendered = false;
		let rendering = false;

		let awaitingRenderComplete: Array<() => void> = [];

		const canvasRenderer = new CanvasRenderer(ctx, new Viewport(() => {}));

		const shouldRerender = (newScale: number) => 1 - newScale / lastScale < -0.25;
		const clampScale = (scale: number) => Math.max(0.2, Math.min(5, scale));

		const result = {
			render: (renderer: AbstractRenderer, _viewport: Rect2) => {
				const scale = clampScale(renderer.getSizeOfCanvasPixelOnScreen() * window.devicePixelRatio);
				console.log(scale);

				if (!rendered) {
					return false;
				}

				// Translate the bounding box such that the PDF is drawn in the correct location
				const transform = Mat33.translation(pageBBox.topLeft).rightMul(
					Mat33.scaling2D(1 / lastScale),
				);

				if (renderer.canRenderFromWithoutDataLoss(canvasRenderer)) {
					renderer.renderFromOtherOfSameType(transform, canvasRenderer);
				} else {
					renderer.drawImage({
						transform,
						image: canvas,
						base64Url: canvas.toDataURL('image/png'),
					});
				}

				return !shouldRerender(scale);
			},

			awaitRenderable: async (viewport: Rect2, scale: number) => {
				scale = clampScale(scale);
				if (rendered && !shouldRerender(scale)) return;
				console.log('rerender', lastScale, scale);

				if (rendering) {
					await new Promise<void>((resolve, _reject) => {
						awaitingRenderComplete.push(() => resolve());
					});

					return;
				}

				rendering = true;

				const renderedPage = await pdfPage.toImagelike(viewport, scale, false);

				canvas.width = pageBBox.width * scale;
				canvas.height = pageBBox.height * scale;
				lastScale = scale;
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(renderedPage, 0, 0, canvas.width, canvas.height);

				rendered = true;
				awaitingRenderComplete.forEach((listener) => listener());
				awaitingRenderComplete = [];

				rendering = false;
			},

			getAnnotations: async (): Promise<AbstractComponent[]> => {
				const pdfjsAnnotations = await pdfPage.getAnnotations();
				//	const pageBBox = await pdfPage.getBBox();

				const annotations: AbstractComponent[] = [];

				for (const annotation of pdfjsAnnotations) {
					const annotationType = annotation.type;
					if (
						annotationType !== AnnotationType.Ink &&
						annotationType !== AnnotationType.FreeText &&
						annotationType !== AnnotationType.Polygon
					) {
						if (annotationType !== AnnotationType.Link) {
							console.warn('Unknown annotation type: ' + annotationType);
						}
						continue;
					}

					const rect = annotation.bbox.translatedBy(pageBBox.topLeft);

					if (annotationType === AnnotationType.Ink || annotationType === AnnotationType.Polygon) {
						const hasVertices = !!annotation.vertices?.length;
						const inkList = hasVertices ? [annotation.vertices] : annotation.inkList;
						const transform = Mat33.translation(Vec2.of(0, pageBBox.topLeft.y)).rightMul(
							Mat33.scaling2D(Vec2.of(1, 1)),
						);

						const color = annotation.color ?? Color4.black;
						const strokeStyle = { color: color, width: annotation.borderWidth ?? 1 };
						const renderStyle = hasVertices
							? { fill: color }
							: { fill: Color4.transparent, stroke: strokeStyle };

						for (const inkPart of inkList) {
							const pathCommands: PathCommand[] = [];

							let i = 0;
							for (i = 1; i < inkPart.length; i++) {
								pathCommands.push({
									kind: PathCommandType.LineTo,
									point: inkPart[i],
								});
							}

							const path = new Path(inkPart[0], pathCommands).transformedBy(transform);
							const strokePart = pathToRenderable(path, renderStyle);
							const stroke = new StrokeComponent([strokePart]);
							stroke.attachLoadSaveData('pdf', { id: annotation.id ?? '' } as PDFLoadSaveData);
							annotations.push(stroke);
						}

						// annotations.push(
						// 	new StrokeComponent([
						// 		pathToRenderable(Path.fromRect(rect), { fill: Color4.transparent, stroke: { width: 2, color: Color4.green }})
						// 	])
						// );
					} else if (annotationType === AnnotationType.FreeText) {
						const content = annotation.contents?.text ?? '';
						const appearance = annotation.fontAppearance ?? {
							size: 1,
							family: 'serif',
							color: Color4.red,
						};

						// TODO: Use content.dir to handle right-to-left support
						const style: TextRenderingStyle = {
							size: appearance.size,
							fontFamily: appearance.family,

							renderingStyle: {
								fill: appearance.color,
							},
						};

						let transform = Mat33.identity;
						if (annotation.rotate) {
							const rotationCCWRad = (-annotation.rotate * Math.PI) / 180;
							transform = Mat33.zRotation(rotationCCWRad, annotation.bbox.center).rightMul(
								transform,
							);
						}
						annotations.push(
							TextComponent.fromLines(content.split('\n'), transform, style).withTopLeft(
								rect.topLeft,
							),
						);
					}
				}

				return annotations;
			},

			updateAnnotations: async (newAnnotatons: AbstractComponent[]) => {
				const translation = pageBBox.topLeft.times(-1);
				const annotationData = newAnnotatons
					.map((annotation) => {
						const originalBBox = annotation.getExactBBox();
						const bbox = originalBBox.translatedBy(translation);
						const loadSaveData = (annotation.getLoadSaveData().pdf ?? []) as PDFLoadSaveData[];
						let id;
						if (loadSaveData.length === 0) {
							id = `newComponent-${Math.random()}`;
							annotation.attachLoadSaveData('pdf', { id });
						} else {
							id = loadSaveData[0].id;
						}
						if (annotation instanceof TextComponent) {
							const textStyle = annotation.getTextStyle();
							const color = annotation.getStyle().color ?? Color4.blue;
							const transform = annotation.getTransform();

							const fontAppearance = {
								size: textStyle.size * transform.getScaleFactor(),
								family: textStyle.fontFamily,
								color,
							};
							const text = annotation.getText();
							// const unrotatedBBox =
							// 	TextComponent
							// 		.getTextDimens(text, textStyle)
							// 		.transformedBoundingBox(Mat33.scaling2D(transform.getScaleFactor()));
							const rotationRadians = transform.transformVec3(Vec2.unitX).angle();
							const rotationDegrees = (rotationRadians * 180) / Math.PI;
							return {
								type: AnnotationType.FreeText,
								// Slightly grow the bounding box to account for font differences.
								bbox: bbox,
								inkList: [],
								color,
								borderWidth: 0,
								contents: { text, direction: 'ltr' },
								rotate: -rotationDegrees,
								fontAppearance,
								id,
							};
						} else if (annotation instanceof StrokeComponent) {
							const color = annotation.getStyle().color ?? Color4.blue;

							let averageStrokeWidth = 0;
							let lastFill = Color4.transparent;
							const inkList: Point2[][] = [];
							for (const part of annotation.getParts()) {
								inkList.push(part.path.approximateWithPoints(0.1).map((p) => p.plus(translation)));
								averageStrokeWidth += part.style.stroke?.width ?? 0;
								lastFill = part.style.fill;
							}
							averageStrokeWidth /= annotation.getParts().length || 1;

							if (lastFill.a > 0) {
								// Polygon annotations are filled, Ink annotations are stroked.
								const result: AnnotationAPIWrapper = {
									type: AnnotationType.Polygon,
									bbox,
									vertices: inkList.flat(),
									inkList: [],
									color: lastFill,
									borderWidth: 0,
									rotate: 0,
									contents: undefined,
									fontAppearance: undefined,
									id,
								};
								return result;
							} else {
								return {
									type: AnnotationType.Ink,
									bbox,
									inkList,
									color,
									rotate: 0,
									borderWidth: averageStrokeWidth,
									contents: undefined,
									fontAppearance: undefined,
									id,
								};
							}
						}
						return null;
					})
					.filter((a) => a !== null) as AnnotationAPIWrapper[];
				pdfPage.replaceAnnotations(annotationData);
			},

			bbox: pageBBox,
		};
		return result;
	}

	private getPageIdxContaining(component: AbstractComponent) {
		let nearestDist = Infinity;
		let nearestAtIndex = 0;
		for (let i = 0; i < this.numPages; i++) {
			const page = this.getPage(i);
			const estimatedDist = Math.max(0, page.bbox.signedDistance(component.getBBox().center));
			if (estimatedDist < nearestDist) {
				nearestDist = estimatedDist;
				nearestAtIndex = i;
			}
		}

		return nearestAtIndex;
	}

	/** Saves annotations (components in the editor) to the PDF. */
	public async applyChanges(image: EditorImage) {
		const annotations = image.getAllElements();
		const annotationsByPage: Array<AbstractComponent[]> = [];
		for (const annotation of annotations) {
			const pageIdx = this.getPageIdxContaining(annotation);
			while (annotationsByPage.length <= pageIdx) {
				annotationsByPage.push([]);
			}
			annotationsByPage[pageIdx].push(annotation);
		}

		for (let i = 0; i < annotationsByPage.length; i++) {
			await this.getPage(i).updateAnnotations(annotationsByPage[i]);
		}
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
	public static fromPDF(pdf: APIWrapper) {
		return new PDFDocumentWrapper(pdf);
	}
}

export default PDFDocumentWrapper;
