// This file is part of an example licensed under the GNU AGPLv3.
// You should have received a copy of the license along with this program.
// If not, see <https://www.gnu.org/licenses/agpl-3.0.en.html>.

import type * as MuPDF from 'mupdf';
import { ColorArray, TransferrableAnnotation } from './types.js';
import { AnnotationType } from '@js-draw/pdf-support/APIWrapper';

interface ExtendedSelf extends WindowOrWorkerGlobalScope {
	mupdf: typeof MuPDF;
	postMessage: (data: unknown, transfer?: Transferable[]) => void;
}
declare const self: ExtendedSelf;

const documents = new Map<string, MuPDF.PDFDocument>();
const pages = new Map<string, [MuPDF.PDFPage, MuPDF.Document]>();
const pageAnnotationIds = new Map<string, string[]>();

let handleId = 0;

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

const boundsToRect = (bounds: number[]) => {
	return {
		x: bounds[0],
		y: bounds[1],
		w: bounds[2] - bounds[0],
		h: bounds[3] - bounds[1],
	};
};
const rectToBounds = (rect: Rect): [number, number, number, number] => {
	const x = rect.x;
	const y = rect.y;
	const w = rect.w;
	const h = rect.h;
	return [x, y, w + x, y + h];
};

const getAnnotationId = (annotation: MuPDF.PDFAnnotation) => {
	const object = annotation.getObject();
	return object.toString();
};

const fontMap__mupdfToHtml: Record<string, string> = {
	TiRo: 'serif',
	Helv: 'sans-serif',
	Cour: 'monospace',
};
const fontMap__htmlToMuPdf: Record<string, string> = {};
for (const key in fontMap__mupdfToHtml) {
	fontMap__htmlToMuPdf[fontMap__mupdfToHtml[key]] = key;
}

const htmlToMuPdfFont = (font: string) => {
	return fontMap__htmlToMuPdf[font.toLowerCase()] ?? font;
};

const muPdfToHtmlFont = (font: string) => {
	if (font === 'Cour') return 'Courier';
	return fontMap__mupdfToHtml[font] ?? font;
};

const processPageAnnotations = (pageHandle: string) => {
	try {
		const page = pages.get(pageHandle)![0];
		const muPdfAnnotations = page.getAnnotations();
		const transferableAnnotations: TransferrableAnnotation[] = [];
		pageAnnotationIds.set(pageHandle, []);

		for (const annotation of muPdfAnnotations) {
			//const isHidden = annotation.getFlags() & (0x1 << 2);
			//if (isHidden) {
			//	continue;
			//}
			console.log('c', annotation.getType());
			const type = annotation.getType();
			const bounds = boundsToRect(annotation.getBounds());
			if (type === 'Ink' || type === 'Polygon' || type === 'FreeText' || type === 'Text') {
				const defaultAppearance =
					type === 'Text' || type === 'FreeText'
						? annotation.getDefaultAppearance()
						: { size: 5, color: [1, 0, 0] as [number, number, number], family: 'monospace' };
				let color: ColorArray = [0];
				if (type === 'Ink') {
					try {
						color = annotation.getColor();
					} catch (err) {
						console.warn(err);
						continue;
					}
				} else {
					color = annotation.hasInteriorColor() ? annotation.getInteriorColor() : [0, 0, 0];
				}
				const opacity = annotation.getOpacity();
				if (opacity !== 1) {
					color.push(opacity);
				}
				let rotate = 0;
				if (annotation.getObject().isIndirect()) {
					rotate = annotation.getObject().resolve().get('Rotate').asNumber() ?? 0;
				}
				const id = getAnnotationId(annotation);
				transferableAnnotations.push({
					type: type as AnnotationType,
					bbox: bounds,
					inkList: annotation.hasInkList() ? annotation.getInkList() : [],
					vertices: annotation.hasVertices() ? annotation.getVertices() : [],
					color,
					borderWidth: annotation.getBorderWidth(),
					contents: { text: annotation.getContents(), direction: 'ltr' },
					rotate: rotate,
					fontAppearance: {
						size: defaultAppearance.size,
						color: defaultAppearance.color,
						family:
							'font' in defaultAppearance ? muPdfToHtmlFont(defaultAppearance.font) : 'Courier',
					},
					id,
					opacity: 1,
				});
				pageAnnotationIds.get(pageHandle)!.push(id);
			}
		}
		return transferableAnnotations;
	} catch (error) {
		console.error(error);
		return [];
	}
};

const api = {
	openDoc: (buffer: ArrayBuffer, name: string) => {
		const doc = self.mupdf.Document.openDocument(buffer, name);
		if (!(doc instanceof self.mupdf.PDFDocument)) {
			throw new Error('Currently, only PDF documents are supported');
		}
		const handle = `doc-${handleId++}`;
		documents.set(handle, doc);
		return handle;
	},
	pageCount: (handle: string) => {
		return documents.get(handle)!.countPages();
	},
	loadPage: (docHandle: string, pageIndex: number) => {
		const pageHandle = `page-${handleId++}`;
		const doc = documents.get(docHandle)!;
		pages.set(pageHandle, [doc.loadPage(pageIndex), doc]);
		return pageHandle;
	},
	'page.getBBox': (pageHandle: string) => {
		return boundsToRect(pages.get(pageHandle)![0].getBounds());
	},
	'page.getAnnotations': processPageAnnotations,
	'page.setAnnotations': (pageHandle: string, annotations: TransferrableAnnotation[]) => {
		const page = pages.get(pageHandle)![0];
		const existingAnnotations = page.getAnnotations();

		const lastAnnotationIds = pageAnnotationIds.get(pageHandle) ?? [];
		const newAnnotationIds: string[] = [];
		pageAnnotationIds.set(pageHandle, newAnnotationIds);

		// Remove any annotations that would be duplicated.
		const toDelete: MuPDF.PDFAnnotation[] = [];
		for (const annotation of existingAnnotations) {
			const existingId = getAnnotationId(annotation);
			console.assert(
				!!existingId,
				'existing annotation missing ID. Annot type: ' + annotation.getType(),
			);
			if (lastAnnotationIds.includes(existingId)) {
				toDelete.push(annotation);
			}
		}
		toDelete.forEach((d) => page.deleteAnnotation(d));
		page.update();

		for (const jsDrawAnnotation of annotations) {
			const type = jsDrawAnnotation.type;
			const muAnnotation = page.createAnnotation(type);
			muAnnotation.setFlags(0);
			if (jsDrawAnnotation.opacity !== undefined) {
				muAnnotation.setOpacity(jsDrawAnnotation.opacity);
			}
			if (jsDrawAnnotation.rotate) {
				muAnnotation.getObject().resolve().put('Rotate', jsDrawAnnotation.rotate);
			}

			if (type === AnnotationType.Ink) {
				muAnnotation.setColor(jsDrawAnnotation.color!);
				muAnnotation.setBorderWidth(jsDrawAnnotation.borderWidth);

				for (const inkListPart of jsDrawAnnotation.inkList) {
					muAnnotation.addInkListStroke();
					for (const point of inkListPart) {
						muAnnotation.addInkListStrokeVertex(point);
					}
				}
			} else if (type === AnnotationType.Polygon) {
				muAnnotation.setInteriorColor(jsDrawAnnotation.color!);
				muAnnotation.setColor(jsDrawAnnotation.color!);
				muAnnotation.setVertices(jsDrawAnnotation.vertices!);
			} else if (type === AnnotationType.FreeText) {
				if (!('contents' in jsDrawAnnotation)) {
					throw new Error('FreeText missing contents prop');
				}
				if (jsDrawAnnotation.contents) {
					muAnnotation.setContents(jsDrawAnnotation.contents.text);
				}
				if (jsDrawAnnotation.fontAppearance) {
					muAnnotation.setDefaultAppearance(
						htmlToMuPdfFont(jsDrawAnnotation.fontAppearance.family),
						jsDrawAnnotation.fontAppearance.size,
						jsDrawAnnotation.fontAppearance.color,
					);
				}

				muAnnotation.setRect(rectToBounds(jsDrawAnnotation.bbox));
				// const matrix = doc.newArray(9);
				// matrix.put(0, 1);
				// matrix.put(1, 0);
				// matrix.put(2, 0);

				// matrix.put(3, 0);
				// matrix.put(4, 2);
				// matrix.put(5, 0);

				// matrix.put(6, 0);
				// matrix.put(7, 0);
				// matrix.put(8, 1);
				// muAnnotation.getObject().resolve().put('Matrix', matrix);
			}
		}
		page.update();
		processPageAnnotations(pageHandle);
	},
	'page.toImagelike': async (pageHandle: string, _rect: Rect, scale: number) => {
		const page = pages.get(pageHandle)![0];
		const pixmap = page.toPixmap(
			[scale, 0, 0, scale, 0, 0],
			self.mupdf.ColorSpace.DeviceRGB,
			true,
			false,
			'View',
		);
		const imageData = new ImageData(
			pixmap.getPixels().slice(),
			pixmap.getWidth(),
			pixmap.getHeight(),
		);
		return await createImageBitmap(imageData);
	},
	'doc.saveToBuffer': (docHandle: string) => {
		const buffer = documents.get(docHandle)!.saveToBuffer().asUint8Array();
		return buffer;
	},
};

onmessage = async (event) => {
	const data = event.data;
	const method = data.method;
	if (typeof method !== 'string') {
		throw new Error(`data.method must be a string`);
	}
	if (!(method in api) || !Object.prototype.hasOwnProperty.call(api, method)) {
		throw new Error(`Unknown method ${method}`);
	}
	const response = await (api as any)[method](...data.args);
	const transfer: Transferable[] = [];
	if (response instanceof ImageBitmap) {
		transfer.push(response);
	}
	self.postMessage(
		{
			type: 'Respond',
			id: data.id,
			response,
		},
		transfer,
	);
};
postMessage({ type: 'Initialized' });
