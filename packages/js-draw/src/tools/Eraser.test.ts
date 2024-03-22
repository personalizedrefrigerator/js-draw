import UnknownSVGObject from '../components/UnknownSVGObject';
import Editor from '../Editor';
import { EditorImage, Rect2, StrokeComponent } from '../lib';
import { LineSegment2, Vec2 } from '@js-draw/math';
import createEditor from '../testing/createEditor';
import sendPenEvent from '../testing/sendPenEvent';
import { InputEvtType } from '../inputEvents';
import Eraser, { EraserMode } from './Eraser';

const selectEraser = (editor: Editor) => {
	const tools = editor.toolController;
	const eraser = tools.getMatchingTools(Eraser)[0];
	eraser.setEnabled(true);

	return eraser;
};

const getAllStrokes = (editor: Editor) => {
	return editor.image.getAllElements().filter(elem => elem instanceof StrokeComponent);
};

describe('Eraser', () => {
	it('should erase object between locations of events', () => {
		const editor = createEditor();

		// Draw a line
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(200, 200));

		// Should have drawn a line
		const strokes = getAllStrokes(editor);
		expect(strokes).toHaveLength(1);
		expect(strokes[0].getBBox().area).toBeGreaterThanOrEqual(200 * 200);

		selectEraser(editor);

		// Erase the line.
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(200, 0));
		jest.advanceTimersByTime(400);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(0, 200));

		// Should have erased the line
		expect(getAllStrokes(editor)).toHaveLength(0);
	});

	it('should erase objects within eraser.thickness of an event when not zoomed', async () => {
		const editor = createEditor();

		await editor.loadFromSVG(`
			<svg>
				<path d='m0,0 l2,0 l0,2 l-2,0 z' fill="#ff0000"/>
				<path d='m50,50 l2,0 l0,2 l-2,0 z' fill="#ff0000"/>
			</svg>
		`, true);

		editor.viewport.resetTransform();

		const allStrokes = getAllStrokes(editor);
		expect(allStrokes).toHaveLength(2);
		expect(allStrokes[0].getBBox()).objEq(new Rect2(0, 0, 2, 2));
		expect(allStrokes[1].getBBox()).objEq(new Rect2(50, 50, 2, 2));

		const eraser = selectEraser(editor);
		eraser.setThickness(10);

		// Erase the first stroke
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(3, 0));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(3, 0));

		expect(getAllStrokes(editor)).toHaveLength(1);

		// Erase the remaining stroke
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(47, 47));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(47, 47));

		expect(getAllStrokes(editor)).toHaveLength(0);
	});

	it('should not erase unselectable objects', () => {
		const editor = createEditor();
		const unerasableObj = new UnknownSVGObject(document.createElementNS('http://www.w3.org/2000/svg', 'arc'));

		// Add to the image
		expect(editor.image.getAllElements()).toHaveLength(0);
		editor.dispatch(EditorImage.addElement(unerasableObj));
		expect(editor.image.getAllElements()).toHaveLength(1);


		const eraser = selectEraser(editor);
		eraser.setThickness(100);

		// Try to erase it.
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(3, 0));

		// Should not have been erased
		expect(editor.image.getAllElements()).toHaveLength(1);
	});

	it.each([
		// A single line, much larger than the eraser to prevent
		// it from being erased completely.
		{
			path: 'M0,0 L200,0',
			strokeWidth: 20,
			eraserSize: 25,
			erasePoints: [ Vec2.of(40, -22), Vec2.of(40, -15), Vec2.of(40, 0), Vec2.of(40, 22) ],
			expected: {
				initialStrokeBBox: Rect2.of({ x: -10, y: -10, w: 220, h: 20 }),
				finalStrokeCount: 2,
				finalStrokesIntersect: [
					new LineSegment2(Vec2.of(0, -100), Vec2.of(0, 100)),
					new LineSegment2(Vec2.of(90, -100), Vec2.of(90, 100)),
					new LineSegment2(Vec2.of(190, -100), Vec2.of(190, 100)),
				],
			},
		},
		// A line-shaped Bezier-curve
		{
			path: 'M0,0 Q50,0 200,0',
			strokeWidth: 20,
			eraserSize: 25,
			erasePoints: [ Vec2.of(40, -22), Vec2.of(40, -15), Vec2.of(40, 0), Vec2.of(40, 22) ],
			expected: {
				initialStrokeBBox: Rect2.of({ x: -10, y: -10, w: 220, h: 20 }),
				finalStrokeCount: 2,
				finalStrokesIntersect: [
					new LineSegment2(Vec2.of(0, -100), Vec2.of(0, 100)),
					new LineSegment2(Vec2.of(90, -100), Vec2.of(90, 100)),
					new LineSegment2(Vec2.of(90, -100), Vec2.of(190, 100)),
				],
			},
		},
		// Another line-shaped Bezier-curve. In the past, this
		// particular test case failed with much the entire left half of the
		// stroke being deleted, when a section should have been removed from the
		// middle.
		{
			path: 'M0,0 Q50,0 100,0',
			strokeWidth: 20,
			eraserSize: 5,
			erasePoints: [
				Vec2.of(41, -15),
				Vec2.of(38, 22),
			],
			expected: {
				initialStrokeBBox: Rect2.of({ x: -10, y: -10, w: 120, h: 20 }),
				finalStrokeCount: 2,
				finalStrokesIntersect: [
					new LineSegment2(Vec2.of(0, -100), Vec2.of(0, 100)),
					new LineSegment2(Vec2.of(90, -100), Vec2.of(90, 100)),
				],
			},
		},
		// Edge case: Should delete partial strokes that are larger than the cursor
		// if the actual path can't be shrunk any further.
		{
			path: 'M0,0q0,0 0,0',
			strokeWidth: 120,
			eraserSize: 40,
			erasePoints: [ Vec2.of(60, 0), Vec2.of(58, 1), Vec2.of(50, 1) ],
			expected: {
				initialStrokeBBox: Rect2.of({ x: -60, y: -60, w: 120, h: 120 }),
				finalStrokeCount: 0,
				finalStrokesIntersect: [ ],
			},
		},
	])('should support erasing partial strokes (case %#)', async (testData) => {
		const editor = createEditor();

		await editor.loadFromSVG(`
			<svg>
				<path d=${JSON.stringify(testData.path)} fill="none" stroke-width="${+testData.strokeWidth}" stroke="red"/>
			</svg>
		`, true);

		editor.viewport.resetTransform();

		const allStrokes = getAllStrokes(editor);
		expect(allStrokes).toHaveLength(1);
		expect(allStrokes[0].getExactBBox()).objEq(testData.expected.initialStrokeBBox);

		const eraser = selectEraser(editor);
		eraser.getModeValue().set(EraserMode.PartialStroke);
		eraser.getThicknessValue().set(testData.eraserSize);

		for (let i = 0; i < testData.erasePoints.length; i++) {
			const point = testData.erasePoints[i];
			const eventType = i === 0 ? InputEvtType.PointerDownEvt : InputEvtType.PointerMoveEvt;
			sendPenEvent(editor, eventType, point);
			jest.advanceTimersByTime(100);
		}
		const lastErasePoint = testData.erasePoints[testData.erasePoints.length - 1];
		sendPenEvent(editor, InputEvtType.PointerUpEvt, lastErasePoint);

		expect(getAllStrokes(editor)).toHaveLength(testData.expected.finalStrokeCount);
		const intersectionResults = [];
		const expectedResults = [];
		for (const line of testData.expected.finalStrokesIntersect) {
			intersectionResults.push(getAllStrokes(editor).some(s => !!s.intersects(line)));
			expectedResults.push(true);
		}
		expect(intersectionResults).toMatchObject(expectedResults);
	});
});