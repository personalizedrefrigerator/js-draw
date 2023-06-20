
import PenTool from './Pen';
import { Vec2 } from '../math/Vec2';
import createEditor from '../testing/createEditor';
import { InputEvtType } from '../types';
import Rect2 from '../math/shapes/Rect2';
import StrokeComponent from '../components/Stroke';
import Mat33 from '../math/Mat33';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import sendPenEvent from '../testing/sendPenEvent';

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

	it('ctrl+z should finalize then undo the current stroke', async () => {
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

		const allElems = editor.image.getAllElements();
		expect(allElems).toHaveLength(1);

		const firstStroke = allElems[0] as StrokeComponent;
		expect(firstStroke.getPath().bbox).objEq(new Rect2(0, 0, 10, 10));
	});
});
