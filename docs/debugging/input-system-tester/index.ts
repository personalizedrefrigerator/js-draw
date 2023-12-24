import * as jsdraw from 'js-draw';
import handwritingSamples from './handwriting-samples';
import { playInputLog as playInputLogSlow } from '@js-draw/debugging';
import 'js-draw/styles';

const slowPlayback = location.href.endsWith('?slow');

const playInputLog = async (editor: jsdraw.Editor, log: any) => {
	if (slowPlayback) {
		await playInputLogSlow(editor, log, 1);
		return;
	}

	const pointersDown = new Map<number, jsdraw.Pointer>();

	for (const event of log) {
		if (!event.timeStamp) continue;

		if (['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].includes(event.eventType)) {
			const device = event.pointerType === 'touch' ? jsdraw.PointerDevice.Touch : jsdraw.PointerDevice.Pen;
			const pointerId: number = event.pointerId;
			const isDown = event.eventType === 'pointerdown' || pointersDown.has(pointerId);
			const screenPos = jsdraw.Vec2.of(event.x, event.y);

			const pointer = jsdraw.Pointer.ofScreenPoint(
				screenPos,
				isDown,
				editor.viewport,
				pointerId,
				device,
				event.isPrimary,
				event.pressure,
				event.timeStamp,
			);

			if (event.eventType === 'pointerup') {
				pointersDown.delete(pointerId);
			} else if (isDown || event.eventType === 'pointerdown') {
				pointersDown.set(pointerId, pointer);
			}

			const toolController = editor.toolController;
			const allPointers = [...pointersDown.values()];

			if (event.eventType === 'pointerdown') {
				toolController.dispatchInputEvent({
					kind: jsdraw.InputEvtType.PointerDownEvt,
					allPointers,
					current: pointer,
				});
			} else if (event.eventType === 'pointermove') {
				toolController.dispatchInputEvent({
					kind: jsdraw.InputEvtType.PointerMoveEvt,
					allPointers,
					current: pointer,
				});
			} else if (event.eventType === 'pointerup') {
				toolController.dispatchInputEvent({
					kind: jsdraw.InputEvtType.PointerUpEvt,
					allPointers,
					current: pointer,
				});
			} else if (event.eventType === 'pointercancel') {
				toolController.dispatchInputEvent({
					kind: jsdraw.InputEvtType.GestureCancelEvt,
				});
			}
		}
	}
};

const makeEditor = (label: string) => {
	const container = document.createElement('div');

	const labelElem = document.createElement('h2');
	labelElem.appendChild(document.createTextNode(label));
	container.appendChild(labelElem);

	const editor = new jsdraw.Editor(container, {
		pens: {
			additionalPenTypes: [
				{
					name: 'Polyline',
					id: 'polyline',
					factory: jsdraw.makePolylineBuilder,
				},
			],
		},
	});

	editor.dispatch(editor.setBackgroundColor(jsdraw.Color4.black));
	editor.dispatch(editor.image.setAutoresizeEnabled(true));

	const penTool = new jsdraw.PenTool(editor, 'Debug tool', {});
	const transformTool = new jsdraw.PanZoomTool(
		editor,
		jsdraw.PanZoomMode.Keyboard|jsdraw.PanZoomMode.SinglePointerGestures|jsdraw.PanZoomMode.TwoFingerTouchGestures,
		'Pan zoom'
	);
	editor.toolController.setTools([ ]);
	editor.toolController.addPrimaryTool(penTool);

	const scaleToImage = () => {
		const editorElement = editor.getRootElement();
		const imageRect = editor.getImportExportRect();
		editorElement.style.width = `${imageRect.width + 4}px`;
		editorElement.style.height = `${imageRect.height + 4}px`;
		editor.viewport.resetTransform(jsdraw.Mat33.translation(imageRect.topLeft.times(-1)));
	};

	const waitForNextAnimationFrame = () => {
		return new Promise<void>(resolve => {
			requestAnimationFrame(() => resolve());
		});
	};

	return {
		container,
		playLog: async (logData: any[]) => {
			editor.viewport.resetTransform();

			await waitForNextAnimationFrame();

			// True data
			penTool.setEnabled(true);
			penTool.setColor(jsdraw.Color4.white);
			penTool.setThickness(2);
			penTool.setStrokeFactory(jsdraw.makePolylineBuilder);

			await playInputLog(editor, logData);

			await waitForNextAnimationFrame();
			editor.viewport.resetTransform();
			await waitForNextAnimationFrame();

			const allTrueStrokes = editor.image.getAllElements();

			// Smoothed stroke
			penTool.setEnabled(true);
			penTool.setColor(jsdraw.Color4.ofRGBA(1, 0.4, 0.2, 0.7));
			penTool.setThickness(2);
			penTool.setStrokeFactory(jsdraw.makeFreehandLineBuilder);

			await playInputLog(editor, logData);

			// Zoom to
			scaleToImage();

			editor.toolController.addPrimaryTool(transformTool);
			transformTool.setEnabled(true);

			editor.dispatch(new jsdraw.Erase(allTrueStrokes));
			labelElem.innerText += ` (${editor.toSVG().outerHTML.length / 1024} KiB)`;
			editor.history.undo();
		},
	};
};

for (const sampleName in handwritingSamples) {
	const editorControl = makeEditor(sampleName);
	document.body.appendChild(editorControl.container);
	editorControl.playLog(handwritingSamples[sampleName as keyof typeof handwritingSamples]);
}
