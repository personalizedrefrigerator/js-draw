import * as jsdraw from 'js-draw';
import { PDFBackground, PDFDocumentWrapper } from '@js-draw/pdf-support';
import 'js-draw/styles';

import 'pdfjs-dist';
declare global {
	const pdfjsLib: any;
	const pdfjsLibPromise: Promise<any>;
}

(async () => {
	await pdfjsLibPromise;

	const editor = new jsdraw.Editor(document.body);
	editor.addToolbar();

	// pdf.worker.js is copied from node_modles (see package.json).
	pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.js';

	const docRequest = pdfjsLib.getDocument('./example.pdf');
	docRequest.onProgress = () => console.log('prog');

	console.log('...');
	docRequest.promise.then(async (pdf: any) => {
		console.log('.then!');
		const doc = PDFDocumentWrapper.fromPDFJS(pdf, pdfjsLib);
		const command = editor.image.addElement(new PDFBackground(doc));
		editor.dispatchNoAnnounce(command);

		// TODO: Move to library
		await doc.awaitPagesLoaded();
		for (let i = 0; i < doc.numPages; i++) {
			const annotations = await doc.getPage(i).getAnnotations();
			for (const annotation of annotations) {
				editor.dispatchNoAnnounce(editor.image.addElement(annotation));
			}
		}
	}, (err: any) => console.error('error', err));


})();
