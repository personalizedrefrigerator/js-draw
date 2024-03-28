// This file is part of an example licensed under the GNU AGPLv3.
// You should have received a copy of the license along with this program.
// If not, see <https://www.gnu.org/licenses/agpl-3.0.en.html>.

import * as mupdf from '../../../node_modules/mupdf/dist/mupdf.js';

/** @type {Map<string, mupdf.Document>} */
const documents = new Map();
/** @type {Map<string, [mupdf.PDFPage, mupdf.Document]>} */
const pages = new Map();
/** @type {Map<string, string>} */
const pageAnnotationIds = new Map();

let handleId = 0;

const boundsToRect = (bounds) => {
	return {
		x: bounds[0],
		y: bounds[1],
		w: bounds[2] - bounds[0],
		h: bounds[3] - bounds[1],
	};
};
const rectToBounds = (rect) => {
	const x = rect.x;
	const y = rect.y;
	const w = rect.w;
	const h = rect.h;
	return [ x, y, w + x, y + h];
};

/** @param {mupdf.PDFAnnotation} annotation */
const getAnnotationId = (annotation) => {
	const object = annotation.getObject();
	return object.toString();
};

const fontMap__mupdfToHtml = {
	'TiRo': 'serif',
	'Helv': 'sans-serif',
	'Cour': 'monospace',
};
const fontMap__htmlToMuPdf = {};
for (const key in fontMap__mupdfToHtml) {
	fontMap__htmlToMuPdf[fontMap__mupdfToHtml[key]] = key;
}

const htmlToMuPdfFont = (font) => {
	return fontMap__htmlToMuPdf[font.toLowerCase()] ?? font;
};

const muPdfToHtmlFont = (font) => {
	if (font === 'Cour') return 'Courier';
	return fontMap__mupdfToHtml[font] ?? font;
};


const processPageAnnotations = (pageHandle) => {
	try {
		const page = pages.get(pageHandle)[0];
		const muPdfAnnotations = page.getAnnotations();
		const transferableAnnotations = [];
		pageAnnotationIds.set(pageHandle, []);

		for (const annotation of muPdfAnnotations) {
			//const isHidden = annotation.getFlags() & (0x1 << 2);
			//if (isHidden) {
			//	continue;
			//}
			console.log('c', annotation.getType());
			const type = annotation.getType();
			const bounds = boundsToRect(annotation.getBounds());
			if (type === 'Ink' || type === 'FreeText') {
				const defaultAppearance =
					type === 'Text' || type === 'FreeText'
						? annotation.getDefaultAppearance()
						: { size: 5, color: [1, 0, 0], family: 'monospace' };
				let color = [0];
				if (type === 'Ink') {
					try {
						color = annotation.getColor();
					} catch(err) {
						console.warn(err);
						continue;
					}
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
					type,
					bbox: bounds,
					inkList: annotation.hasInkList() ? annotation.getInkList() : [],
					color,
					borderWidth: annotation.getBorderWidth(),
					contents: { text: annotation.getContents() },
					rotate: rotate,
					fontAppearance: {
						size: defaultAppearance.size,
						color: defaultAppearance.color,
						family: muPdfToHtmlFont(defaultAppearance.font),
					},
					id,
				});
				pageAnnotationIds.get(pageHandle).push(id);
			}
		}
		return transferableAnnotations;
	} catch(error) {
		console.error(error);
		return [];
	}
};


const api = {
	/** @param {ArrayBuffer} buffer */
	'openDoc': (buffer, name) => {
		const doc = mupdf.Document.openDocument(buffer, name);
		const handle = `doc-${handleId++}`;
		documents.set(handle, doc);
		return handle;
	},
	'pageCount': (handle) => {
		return documents.get(handle).countPages();
	},
	'loadPage': (docHandle, pageIndex) => {
		const pageHandle = `page-${handleId++}`;
		const doc = documents.get(docHandle);
		pages.set(pageHandle, [doc.loadPage(pageIndex), doc]);
		return pageHandle;
	},
	'page.getBBox': (pageHandle) => {
		return boundsToRect(pages.get(pageHandle)[0].getBounds());
	},
	'page.getAnnotations': processPageAnnotations,
	'page.setAnnotations': (pageHandle, annotations) => {
		const page = pages.get(pageHandle)[0];
		const existingAnnotations = page.getAnnotations();

		const lastAnnotationIds = pageAnnotationIds.get(pageHandle) ?? [];
		const newAnnotationIds = [];
		pageAnnotationIds.set(pageHandle, newAnnotationIds);

		// Remove any annotations that would be duplicated.
		const toDelete = [];
		for (const annotation of existingAnnotations) {
			const existingId = getAnnotationId(annotation);
			console.assert(!!existingId, 'existing annotation missing ID. Annot type: ' + annotation.getType());
			if (lastAnnotationIds.includes(existingId)) {
				toDelete.push(annotation);
			}
		}
		toDelete.forEach(d => page.deleteAnnotation(d));
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

			if (type === 'Ink') {
				muAnnotation.setColor(jsDrawAnnotation.color);
				muAnnotation.setBorderWidth(jsDrawAnnotation.borderWidth);

				for (const inkListPart of jsDrawAnnotation.inkList) {
					muAnnotation.addInkListStroke();
					for (const point of inkListPart) {
						muAnnotation.addInkListStrokeVertex(point);
					}
				}
			}
			else if (type === 'FreeText') {
				muAnnotation.setContents(jsDrawAnnotation.contents.text);
				muAnnotation.setDefaultAppearance(
					htmlToMuPdfFont(jsDrawAnnotation.fontAppearance.family),
					jsDrawAnnotation.fontAppearance.size,
					jsDrawAnnotation.fontAppearance.color,
				);
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
	'page.toImagelike': async (pageHandle, _rect, scale) => {
		const page = pages.get(pageHandle)[0];
		const pixmap = page.toPixmap(
			[scale,0,0,scale,0,0],
			mupdf.ColorSpace.DeviceRGB,
			true,
			false,
			'View'
		);
		const imageData = new ImageData(pixmap.getPixels().slice(), pixmap.getWidth(), pixmap.getHeight());
		return await createImageBitmap(imageData);
	},
	'doc.saveToBuffer': (docHandle) => {
		const buffer = documents.get(docHandle).saveToBuffer().asUint8Array();
		return buffer;
	},
};

onmessage = async event => {
	const data = event.data;
	const response = await api[data.method](...data.args);
	const transfer = [];
	if (response instanceof ImageBitmap) {
		transfer.push(response);
	}
	postMessage({
		type: 'Respond',
		id: data.id,
		response,
	}, transfer);
};
postMessage({ type: 'Initialized'});