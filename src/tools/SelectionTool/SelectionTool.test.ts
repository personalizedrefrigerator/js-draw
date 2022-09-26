import Color4 from '../../Color4';
import Stroke from '../../components/Stroke';
import Editor from '../../Editor';
import EditorImage from '../../EditorImage';
import Path from '../../math/Path';
import { Vec2 } from '../../math/Vec2';
import { InputEvtType } from '../../types';
import SelectionTool from './SelectionTool';
import createEditor from '../../testing/createEditor';

const getSelectionTool = (editor: Editor): SelectionTool => {
	return editor.toolController.getMatchingTools(SelectionTool)[0];
};

const createSquareStroke = (size: number = 1) => {
	const testStroke = new Stroke([
		// A filled square
		Path.fromString(`M0,0 L${size},0 L${size},${size} L0,${size} Z`).toRenderable({ fill: Color4.blue }),
	]);
	const addTestStrokeCommand = EditorImage.addElement(testStroke);

	return { testStroke, addTestStrokeCommand };
};

describe('SelectionTool', () => {
	it('selection should shrink/grow to bounding box of selected objects', () => {
		const { addTestStrokeCommand } = createSquareStroke();

		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(0.1, 0.1));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(0.1, 0.1));

		// Should surround the selected object (which has bbox = (0, 0, 1, 1))
		// with extra space.
		const paddingSize = selectionTool.getSelection()!.getMinCanvasSize();
		expect(selectionTool.getSelection()!.region).toMatchObject({
			x: -paddingSize / 2,
			y: -paddingSize / 2,
			w: paddingSize + 1,
			h: paddingSize + 1,
		});
	});

	it('dragging the selected region should move selected items', () => {
		const { testStroke, addTestStrokeCommand } = createSquareStroke(50);
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		// Select the object
		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(5, 5));

		const selection = selectionTool.getSelection();
		expect(selection).not.toBeNull();

		// Drag the object
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(25, 25));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(30, 30));

		expect(testStroke.getBBox().topLeft).toMatchObject({
			x: 5,
			y: 5,
		});

		editor.history.undo();

		expect(testStroke.getBBox().topLeft).toMatchObject({
			x: 0,
			y: 0,
		});
	});

	it('moving the selection with a keyboard should move the view to keep the selection in view', () => {
		const { addTestStrokeCommand } = createSquareStroke(100);
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		// Select the stroke
		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(100, 100));

		const selection = selectionTool.getSelection();
		if (selection === null) {
			// Throw to allow TypeScript's non-null checker to understand that selection
			// must be non-null after this.
			throw new Error('Selection should be non-null.');
		}


		editor.sendPenEvent(InputEvtType.PointerDownEvt, Vec2.of(5, 5));
		editor.sendPenEvent(InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		editor.sendPenEvent(InputEvtType.PointerUpEvt, Vec2.of(100, 100));
		expect(editor.viewport.visibleRect.containsPoint(selection.region.center)).toBe(true);
	});
});
