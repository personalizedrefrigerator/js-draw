import * as jsdraw from 'js-draw';
import handwritingSamples from './handwriting-samples';
import { playInputLog as playInputLogSlow, InputLogEvent } from '@js-draw/debugging';
import 'js-draw/styles';

const slowPlayback = location.href.endsWith('?slow');

const playInputLog = async (
	editor: jsdraw.Editor,
	log: InputLogEvent[],
	forceFastPlayback = false,
) => {
	const editorBBox = jsdraw.Rect2.of(editor.getRootElement().getBoundingClientRect());
	const offset = editorBBox.topLeft.times(-1);

	if (slowPlayback && !forceFastPlayback) {
		return await playInputLogSlow(editor, log, { rate: 1, offset });
	} else {
		return await playInputLogSlow(editor, log, { offset });
	}
};

const makePerformanceGraph = (eventDurations: number[]) => {
	const createSvgElement = (elementName: string) => {
		return document.createElementNS('http://www.w3.org/2000/svg', elementName);
	};
	const svg = createSvgElement('svg');
	const path = createSvgElement('path');

	let maximumDuration = 0;
	for (const duration of eventDurations) {
		maximumDuration = Math.max(duration, maximumDuration);
	}
	const outputHeight = eventDurations.length;
	const scaleY = outputHeight / maximumDuration;

	path.setAttribute(
		'd',
		eventDurations
			.map((duration, index) => {
				const roundingFactor = 1000;
				const yValue = -Math.round(duration * scaleY * roundingFactor) / roundingFactor;
				return `${index > 0 ? 'L' : 'M'}${index},${yValue}`;
			})
			.join(' '),
	);
	path.style.stroke = 'red';
	path.style.strokeWidth = '1';
	path.style.fill = 'none';

	svg.setAttribute(
		'viewBox',
		[
			0, // min-x
			-outputHeight, // min-y
			eventDurations.length, // width
			outputHeight, // height
		].join(' '),
	);
	svg.setAttribute('width', '300');
	svg.setAttribute('height', '300');
	svg.appendChild(path);

	const graph = document.createElement('figure');
	graph.appendChild(svg);
	const caption = document.createElement('figcaption');
	caption.textContent =
		'The above graph shows the time recorded for each event. Time is on the y-axis, the event index is on the x-axis.';
	graph.appendChild(caption);

	return graph;
};

const makeEditor = (label: string) => {
	const container = document.createElement('div');

	const headerElem = document.createElement('h2');
	headerElem.appendChild(document.createTextNode(label));
	container.appendChild(headerElem);

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
		jsdraw.PanZoomMode.Keyboard |
			jsdraw.PanZoomMode.SinglePointerGestures |
			jsdraw.PanZoomMode.TwoFingerTouchGestures,
		'Pan zoom',
	);
	editor.toolController.setTools([]);
	editor.toolController.addPrimaryTool(penTool);

	const scaleToImage = () => {
		const editorElement = editor.getRootElement();
		const imageRect = editor.getImportExportRect();
		editorElement.style.width = `${imageRect.width + 4}px`;
		editorElement.style.height = `${imageRect.height + 4}px`;
		editor.viewport.resetTransform(jsdraw.Mat33.translation(imageRect.topLeft.times(-1)));
	};

	const waitForNextAnimationFrame = () => {
		return new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});
	};

	const labelElem = document.createElement('ul');
	container.appendChild(labelElem);
	const logInfo = (info: string | Element) => {
		const infoLine = document.createElement('li');
		infoLine.appendChild(typeof info === 'string' ? document.createTextNode(info) : info);
		labelElem.appendChild(infoLine);
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

			await playInputLog(editor, logData, true);

			await waitForNextAnimationFrame();
			editor.viewport.resetTransform();
			await waitForNextAnimationFrame();

			const allTrueStrokes = editor.image.getAllComponents();

			// Smoothed stroke
			penTool.setEnabled(true);
			penTool.setColor(jsdraw.Color4.ofRGBA(1, 0.4, 0.2, 0.7));
			penTool.setThickness(2);
			penTool.setStrokeFactory(jsdraw.makeFreehandLineBuilder);

			const stats = await playInputLog(editor, logData);

			// Zoom to
			scaleToImage();

			editor.toolController.addPrimaryTool(transformTool);
			transformTool.setEnabled(true);

			editor.dispatch(new jsdraw.Erase(allTrueStrokes));
			logInfo(`SVG size: ${editor.toSVG().outerHTML.length / 1024} KiB`);
			editor.history.undo();
			const averageTimePerEvent = stats.perfData.avgTimePerEvent;
			logInfo(`Average time per event: ${Math.round(averageTimePerEvent * 100) / 100}ms`);
			logInfo(makePerformanceGraph(stats.perfData.timeDeltas));
		},
	};
};

const editorContainer = document.getElementById('editor-container')!;
for (const sampleName in handwritingSamples) {
	const editorControl = makeEditor(sampleName);
	editorContainer.appendChild(editorControl.container);
	editorControl.playLog(handwritingSamples[sampleName as keyof typeof handwritingSamples]);
}
