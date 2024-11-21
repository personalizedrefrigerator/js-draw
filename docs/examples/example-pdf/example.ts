// This file is part of an example licensed under the GNU AGPLv3.
// You should have received a copy of the license along with this program.
// If not, see <https://www.gnu.org/licenses/agpl-3.0.en.html>.

import * as jsdraw from 'js-draw';
import {
	APIWrapper,
	AnnotationAPIWrapper,
	PDFBackground,
	PDFDocumentWrapper,
	PageAPIWrapper,
} from '@js-draw/pdf-support';
import 'js-draw/styles';
import { Color4, Rect2 } from 'js-draw';
import { ColorArray, TransferrableAnnotation } from './types.js';

let workerRequest = (_method: string, ..._args: any[]): Promise<any> => {
	throw new Error('Worker not initialized');
};
const initializeWorker = () => {
	return new Promise<void>((resolve) => {
		const worker = new Worker('./worker.mjs', { type: 'module' });
		const workerRequests = new Map<string, (arg: any) => void>();

		worker.onmessage = (event) => {
			const message = event.data;

			if (message.type === 'Respond') {
				workerRequests.get(message.id)!(message.response);
				workerRequests.delete(message.id);
			} else if (message.type === 'Initialized') {
				resolve();
			}
		};

		let nextId = 0;
		workerRequest = (method: string, ...args: any[]) => {
			return new Promise<any>((resolve) => {
				const id = `request-${nextId++}`;
				worker.postMessage({ method, args, id });
				workerRequests.set(id, (arg) => {
					resolve(arg);
				});
			});
		};
	});
};

const annotationToTransferrable = (annotation: AnnotationAPIWrapper): TransferrableAnnotation => {
	const colorArray = annotation.color?.asRGBAArray();
	const mainColor = annotation.color ?? annotation.fontAppearance?.color ?? Color4.black;
	return {
		type: annotation.type,
		bbox: annotation.bbox.xywh(),
		inkList: annotation.inkList.map((l) => l.map((p) => [p.x, p.y])),
		color: colorArray?.slice(0, 3) as ColorArray | undefined,
		opacity: mainColor.a,
		borderWidth: annotation.borderWidth,
		contents: annotation.contents,
		rotate: annotation.rotate,
		fontAppearance: annotation.fontAppearance
			? {
					size: annotation.fontAppearance.size,
					color: annotation.fontAppearance.color.asRGBAArray().slice(0, 3) as ColorArray,
					family: annotation.fontAppearance.family,
				}
			: undefined,
		id: annotation.id,
	};
};

const annotationFromTransferrable = (annotation: TransferrableAnnotation) => {
	const result: AnnotationAPIWrapper = {
		type: annotation.type,
		bbox: Rect2.of(annotation.bbox),
		inkList: annotation.inkList.map((l: number[][]) => l.map((p) => jsdraw.Vec2.of(p[0], p[1]))),
		color: jsdraw.Color4.fromArray(annotation.color ?? [0], annotation.opacity ?? 1),
		borderWidth: annotation.borderWidth,
		contents: {
			text: annotation.contents?.text ?? 'no',
			direction: annotation.contents?.direction ?? 'ltr',
		},
		rotate: annotation.rotate,
		fontAppearance: annotation.fontAppearance
			? {
					size: annotation.fontAppearance.size,
					color: jsdraw.Color4.fromArray(annotation.fontAppearance.color, 1),
					family: annotation.fontAppearance.family ?? 'sans',
				}
			: undefined,
		id: annotation.id,
	};
	return result;
};

(async () => {
	await initializeWorker();

	const requestFile = () => {
		return new Promise<ArrayBuffer>((resolve, reject) => {
			const container = document.createElement('dialog');
			const input = document.createElement('input');
			input.type = 'file';
			input.onchange = async (_event) => {
				if (input.files?.length) {
					container.remove();

					const buffer = await input.files.item(0)?.arrayBuffer();
					if (buffer) {
						resolve(buffer);
					} else {
						reject(new Error('No buffer found.'));
					}
				}
			};
			container.appendChild(input);
			document.body.appendChild(container);
			container.showModal();
		});
	};

	const editor = new jsdraw.Editor(document.body);
	const toolbar = editor.addToolbar();
	editor.dispatchNoAnnounce(editor.image.setAutoresizeEnabled(true));

	const pdf = await requestFile();
	const docHandle = await workerRequest('openDoc', pdf, 'example.pdf');
	const pageCount = await workerRequest('pageCount', docHandle);
	const docWrapper: APIWrapper = {
		pageCount: () => pageCount,
		async loadPage(idx) {
			const pageHandle = await workerRequest('loadPage', docHandle, idx);
			const result: PageAPIWrapper = {
				async getBBox() {
					const bboxCoords = await workerRequest('page.getBBox', pageHandle);
					return Rect2.of(bboxCoords);
				},
				async toImagelike(visibleRect: Rect2, scale: number, _showAnnotations: boolean) {
					const bitmap = await workerRequest(
						'page.toImagelike',
						pageHandle,
						visibleRect.xywh(),
						scale,
					);
					return bitmap;
				},
				async getAnnotations() {
					const annotationData = await workerRequest('page.getAnnotations', pageHandle);
					return annotationData.map((annotation: TransferrableAnnotation) => {
						return annotationFromTransferrable(annotation);
					});
				},
				async replaceAnnotations(newAnnotations) {
					const transferableAnnotatons = newAnnotations.map(annotationToTransferrable);
					await workerRequest('page.setAnnotations', pageHandle, transferableAnnotatons);
				},
			};
			return result;
		},
	};

	const doc = PDFDocumentWrapper.fromPDF(docWrapper);
	const pdfBackground = new PDFBackground(doc);
	const command = editor.image.addElement(pdfBackground);
	editor.dispatchNoAnnounce(command);

	// TODO: Move to library
	await doc.awaitPagesLoaded();
	for (let i = 0; i < doc.numPages; i++) {
		const annotations = await doc.getPage(i).getAnnotations();
		for (const annotation of annotations) {
			editor.dispatchNoAnnounce(editor.image.addElement(annotation));
		}
	}

	let lastObjectURL: string | undefined = undefined;
	const saveButton = toolbar.addSaveButton(async () => {
		saveButton.setDisabled(true);
		try {
			await doc.applyChanges(editor.image);

			if (lastObjectURL) {
				URL.revokeObjectURL(lastObjectURL);
			}

			const buffer = await workerRequest('doc.saveToBuffer', docHandle);
			const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
			const downloadLink = document.createElement('a');
			downloadLink.target = '_blank';
			downloadLink.href = url;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			downloadLink.remove();
			lastObjectURL = url;
		} finally {
			saveButton.setDisabled(false);
		}
	});
})();
