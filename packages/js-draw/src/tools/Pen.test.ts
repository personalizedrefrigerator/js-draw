import PenTool from './Pen';
import { Mat33, Point2, Rect2, Vec2 } from '@js-draw/math';
import createEditor from '../testing/createEditor';
import { InputEvtType, PointerEvtType } from '../inputEvents';
import StrokeComponent from '../components/Stroke';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import sendPenEvent from '../testing/sendPenEvent';
import sendTouchEvent from '../testing/sendTouchEvent';
import Pointer, { PointerDevice } from '../Pointer';
import EditorImage from '../image/EditorImage';

const getAllStrokes = (image: EditorImage) => {
	return image.getAllComponents().filter((elem) => elem instanceof StrokeComponent);
};

describe('Pen', () => {
	it('should draw horizontal lines', () => {
		const editor = createEditor();
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		for (let i = 0; i < 10; i++) {
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(i, 0));
			jest.advanceTimersByTime(200);
		}
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(200, 0));

		const elems = editor.image.getElementsIntersectingRegion(new Rect2(0, 10, 10, -10));
		expect(elems).toHaveLength(1);

		// Account for stroke width
		const tolerableError = 8;
		expect(elems[0].getBBox().topLeft).objEq(Vec2.of(0, 0), tolerableError);
		expect(elems[0].getBBox().bottomRight).objEq(Vec2.of(200, 0), tolerableError);
	});

	it('should draw vertical line', () => {
		const editor = createEditor();
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		for (let i = 0; i < 10; i++) {
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(0, i * 20));
			jest.advanceTimersByTime(200);
		}
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(0, 150));

		const elems = editor.image.getElementsIntersectingRegion(Rect2.unitSquare);
		expect(elems).toHaveLength(1);

		expect(elems[0].getBBox().topLeft).objEq(Vec2.of(0, 0), 8); // ± 8
		expect(elems[0].getBBox().bottomRight).objEq(Vec2.of(0, 175), 25); // ± 25
	});

	it('should draw vertical line with slight bend', () => {
		const editor = createEditor();

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(417, 24));
		jest.advanceTimersByTime(245);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 197));
		jest.advanceTimersByTime(20);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 199));
		jest.advanceTimersByTime(12);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 201));
		jest.advanceTimersByTime(40);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 203));
		jest.advanceTimersByTime(14);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 206));
		jest.advanceTimersByTime(35);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 208));
		jest.advanceTimersByTime(16);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 211));
		jest.advanceTimersByTime(51);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 215));
		jest.advanceTimersByTime(32);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 218));
		jest.advanceTimersByTime(30);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 220));
		jest.advanceTimersByTime(24);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 222));
		jest.advanceTimersByTime(14);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 224));
		jest.advanceTimersByTime(32);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 227));
		jest.advanceTimersByTime(17);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 229));
		jest.advanceTimersByTime(53);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 234));
		jest.advanceTimersByTime(34);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 236));
		jest.advanceTimersByTime(17);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 238));
		jest.advanceTimersByTime(39);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 240));
		jest.advanceTimersByTime(10);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 243));
		jest.advanceTimersByTime(34);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 250));
		jest.advanceTimersByTime(57);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 252));
		jest.advanceTimersByTime(8);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(422, 256));
		jest.advanceTimersByTime(28);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(422, 258));
		jest.advanceTimersByTime(21);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(421, 262));
		jest.advanceTimersByTime(34);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 264));
		jest.advanceTimersByTime(5);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 266));
		jest.advanceTimersByTime(22);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 268));
		jest.advanceTimersByTime(22);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 271));
		jest.advanceTimersByTime(18);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 274));
		jest.advanceTimersByTime(33);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 277));
		jest.advanceTimersByTime(16);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 279));
		jest.advanceTimersByTime(36);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 282));
		jest.advanceTimersByTime(15);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 284));
		jest.advanceTimersByTime(48);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 289));
		jest.advanceTimersByTime(16);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 291));
		jest.advanceTimersByTime(31);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 295));
		jest.advanceTimersByTime(23);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 301));
		jest.advanceTimersByTime(31);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 306));
		jest.advanceTimersByTime(18);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 308));
		jest.advanceTimersByTime(20);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 310));
		jest.advanceTimersByTime(13);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 313));
		jest.advanceTimersByTime(17);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 317));
		jest.advanceTimersByTime(33);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 321));
		jest.advanceTimersByTime(15);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 324));
		jest.advanceTimersByTime(23);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 326));
		jest.advanceTimersByTime(14);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(419, 329));
		jest.advanceTimersByTime(36);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 333));
		jest.advanceTimersByTime(8);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 340));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(420, 340));

		const elems = editor.image.getElementsIntersectingRegion(new Rect2(0, 0, 1000, 1000));
		expect(elems).toHaveLength(1);

		expect(elems[0].getBBox().topLeft).objEq(Vec2.of(420, 24), 32); // ± 32
		expect(elems[0].getBBox().bottomRight).objEq(Vec2.of(420, 340), 25); // ± 25
	});

	it('should finalize strokes even if drawn with a nonprimary stylus', () => {
		const editor = createEditor();

		// See https://github.com/personalizedrefrigerator/js-draw/issues/71
		const sendNonPrimaryPenEvent = (eventType: PointerEvtType, point: Point2) => {
			const id = 0;
			const isPrimary = false;
			const mainPointer = Pointer.ofCanvasPoint(
				point,
				eventType !== InputEvtType.PointerUpEvt,
				editor.viewport,
				id,
				PointerDevice.Pen,
				isPrimary,
			);

			editor.toolController.dispatchInputEvent({
				kind: eventType,
				allPointers: [mainPointer],
				current: mainPointer,
			});
			jest.advanceTimersByTime(35);

			return mainPointer;
		};

		// Should draw with a nonprimary stylus
		sendNonPrimaryPenEvent(InputEvtType.PointerDownEvt, Vec2.of(10, 10));
		sendNonPrimaryPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(20, 20));
		sendNonPrimaryPenEvent(InputEvtType.PointerUpEvt, Vec2.of(50, 50));

		sendNonPrimaryPenEvent(InputEvtType.PointerDownEvt, Vec2.of(10, 20));
		sendNonPrimaryPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(20, 30));
		sendNonPrimaryPenEvent(InputEvtType.PointerUpEvt, Vec2.of(50, 60));

		expect(getAllStrokes(editor.image)).toHaveLength(2);

		// Should ignore touch events sent while drawing with a nonprimary stylus
		sendNonPrimaryPenEvent(InputEvtType.PointerDownEvt, Vec2.of(10, 10));
		const mainPointer = sendNonPrimaryPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(20, 20));

		// Touch the screen -- should be ignored.
		sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0), [mainPointer]);
		sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(5, 0), [mainPointer]);
		jest.advanceTimersByTime(50);
		sendTouchEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(10, 0), [mainPointer]);

		sendNonPrimaryPenEvent(InputEvtType.PointerUpEvt, Vec2.of(50, 50));

		// Should have added the stroke.
		expect(getAllStrokes(editor.image)).toHaveLength(3);
	});

	// if `mainEventIsPen` is false, tests with touch events.
	const testEventCancelation = (mainEventIsPen: boolean) => {
		const editor = createEditor();

		expect(editor.image.getElementsIntersectingRegion(new Rect2(0, 0, 1000, 1000))).toHaveLength(0);

		const sendMainEvent = mainEventIsPen ? sendPenEvent : sendTouchEvent;

		// Start the drawing
		const mainPointer = sendMainEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(417, 24));
		jest.advanceTimersByTime(245);
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 197));
		jest.advanceTimersByTime(20);
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 199));
		jest.advanceTimersByTime(12);
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 201));
		jest.advanceTimersByTime(40);
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(423, 203));
		jest.advanceTimersByTime(14);

		// Attempt to cancel the drawing
		let firstPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0), [
			mainPointer,
		]);
		let secondPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(100, 0), [
			firstPointer,
			mainPointer,
		]);

		const maxIterations = 10;
		for (let i = 0; i < maxIterations; i++) {
			jest.advanceTimersByTime(100);

			const point1 = Vec2.of(-i * 5, 0);
			const point2 = Vec2.of(i * 5 + 100, 0);

			const eventType = InputEvtType.PointerMoveEvt;
			firstPointer = sendTouchEvent(editor, eventType, point1, [secondPointer, mainPointer]);
			secondPointer = sendTouchEvent(editor, eventType, point2, [firstPointer, mainPointer]);

			if (i === maxIterations - 1) {
				jest.advanceTimersByTime(10);

				sendTouchEvent(editor, InputEvtType.PointerUpEvt, point1, [secondPointer, mainPointer]);
				sendTouchEvent(editor, InputEvtType.PointerUpEvt, point2, [mainPointer]);
			}

			jest.advanceTimersByTime(100);
		}

		// Finish the drawing
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 333), [
			firstPointer,
			secondPointer,
		]);
		jest.advanceTimersByTime(8);
		sendMainEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(420, 340), [
			firstPointer,
			secondPointer,
		]);
		sendMainEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(420, 340), [
			firstPointer,
			secondPointer,
		]);

		const elementsInDrawingArea = editor.image.getElementsIntersectingRegion(
			new Rect2(0, 0, 1000, 1000),
		);
		if (mainEventIsPen) {
			expect(elementsInDrawingArea).toHaveLength(1);
		} else {
			expect(elementsInDrawingArea).toHaveLength(0);
		}
	};

	it('pen events should not be cancelable by touch events', () => {
		testEventCancelation(true);
	});

	it('touch events should be cancelable by touch events', () => {
		testEventCancelation(false);
	});

	it('ctrl+z should finalize then undo the current stroke', () => {
		const editor = createEditor();

		expect(editor.history.undoStackSize).toBe(0);

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(10, 10));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(20, 10));

		const ctrlKeyDown = true;
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'z', ctrlKeyDown);

		// Stroke should have been undone
		expect(editor.history.redoStackSize).toBe(1);

		// Lifting the pointer up shouldn't clear the redo stack.
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(420, 340));
		expect(editor.history.redoStackSize).toBe(1);
	});

	it('holding ctrl should snap the stroke to grid', () => {
		const editor = createEditor();
		editor.viewport.resetTransform(Mat33.identity);

		const penTool = editor.toolController.getMatchingTools(PenTool)[0];
		penTool.setStrokeFactory(makeFreehandLineBuilder);

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0.1, 0.1));
		jest.advanceTimersByTime(100);
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(10.1, 10.1));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(10.1, 10.1));

		const allElems = editor.image.getAllComponents();
		expect(allElems).toHaveLength(1);

		const firstStroke = allElems[0] as StrokeComponent;
		expect(firstStroke.getPath().bbox).objEq(new Rect2(0, 0, 10, 10));
	});

	it('holding the pen stationary after a stroke should enable autocorrection', async () => {
		const editor = createEditor();
		editor.viewport.resetTransform(Mat33.identity);

		const penTool = editor.toolController.getMatchingTools(PenTool)[0];
		penTool.setStrokeFactory(makeFreehandLineBuilder);
		penTool.setStrokeAutocorrectEnabled(true);

		const tolerance = 0.01;
		// To help with bbox calculations (so that stroke width can be ignored)
		penTool.setThickness(tolerance / 100);

		jest.useFakeTimers();

		const drawLineWithBump = async (includePause: boolean) => {
			sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
			await jest.advanceTimersByTimeAsync(100);
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(40, 9));
			await jest.advanceTimersByTimeAsync(100);
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(50, 7));
			await jest.advanceTimersByTimeAsync(100);
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(60, 9));
			await jest.advanceTimersByTimeAsync(100);
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(100, 0));
			if (includePause) {
				for (let i = 0; i < 12; i++) {
					await jest.advanceTimersByTimeAsync(200);
					sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(100, 0));
				}
			} else {
				await jest.advanceTimersByTimeAsync(200);
			}
			sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 0));
		};

		await drawLineWithBump(false);
		await drawLineWithBump(true);

		const allElems = editor.image.getAllComponents();
		expect(allElems).toHaveLength(2);

		// Should roughly have a bump (roughly because stroke smoothing will adjust this)
		const firstStroke = allElems[0] as StrokeComponent;
		const firstStrokeBBox = firstStroke.getPath().bbox;
		expect(firstStrokeBBox.topLeft).objEq(Vec2.of(0, 0), 4);
		expect(firstStrokeBBox.bottomRight).objEq(Vec2.of(100, 10), 4);

		const secondStroke = allElems[1] as StrokeComponent;
		expect(secondStroke.getPath().bbox).objEq(new Rect2(0, 0, 100, 0), tolerance);

		// Should still be able to draw
		await drawLineWithBump(false);
		expect(editor.image.getAllComponents()).toHaveLength(3);
	});
});
