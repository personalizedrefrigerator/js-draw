import Editor from '../Editor';
import { Rect2, StrokeComponent } from '../lib';
import { Vec2 } from '../math/Vec2';
import createEditor from '../testing/createEditor';
import { InputEvtType } from '../types';
import Eraser from './Eraser';

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
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		jest.advanceTimersByTime(100);
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(200, 200));

		// Should have drawn a line
		const strokes = getAllStrokes(editor);
		expect(strokes).toHaveLength(1);
		expect(strokes[0].getBBox().area).toBeGreaterThanOrEqual(200 * 200);

		selectEraser(editor);

		// Erase the line.
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(200, 0));
		jest.advanceTimersByTime(400);
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(0, 200));

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
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(3, 0));
		jest.advanceTimersByTime(100);
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(3, 0));

		expect(getAllStrokes(editor)).toHaveLength(1);

		// Erase the remaining stroke
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(47, 47));
		jest.advanceTimersByTime(100);
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(47, 47));

		expect(getAllStrokes(editor)).toHaveLength(0);
	});
});