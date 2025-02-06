import Stroke from '../../components/Stroke';
import Editor from '../../Editor';
import EditorImage from '../../image/EditorImage';
import { InputEvtType } from '../../inputEvents';
import Selection from './Selection';
import SelectionTool from './SelectionTool';
import createEditor from '../../testing/createEditor';
import Pointer from '../../Pointer';
import { Rect2, Vec2, Path, Color4 } from '@js-draw/math';
import sendPenEvent from '../../testing/sendPenEvent';
import { pathToRenderable } from '../../rendering/RenderablePathSpec';
import { EditorEventType } from '../../types';
import SerializableCommand from '../../commands/SerializableCommand';

const getSelectionTool = (editor: Editor): SelectionTool => {
	return editor.toolController.getMatchingTools(SelectionTool)[0];
};

const createSquareStroke = (size: number = 1) => {
	const testStroke = new Stroke([
		// A filled square
		pathToRenderable(Path.fromString(`M0,0 L${size},0 L${size},${size} L0,${size} Z`), {
			fill: Color4.blue,
		}),
	]);
	const addTestStrokeCommand = EditorImage.addComponent(testStroke);

	return { testStroke, addTestStrokeCommand };
};

const createEditorWithSingleObjectSelection = (objectSize: number = 50) => {
	const { testStroke, addTestStrokeCommand } = createSquareStroke(objectSize);
	const editor = createEditor();
	editor.dispatch(addTestStrokeCommand);

	// Select the object
	const selectionTool = getSelectionTool(editor);
	selectionTool.setEnabled(true);
	sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
	sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
	sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(5, 5));

	return { editor, testStroke, selectionTool };
};

const dragSelection = (editor: Editor, selection: Selection, startPt: Vec2, endPt: Vec2) => {
	selection.onDragStart(Pointer.ofCanvasPoint(startPt, true, editor.viewport));
	jest.advanceTimersByTime(100);

	selection.onDragUpdate(Pointer.ofCanvasPoint(endPt, true, editor.viewport));
	jest.advanceTimersByTime(100);

	selection.onDragEnd();
};

describe('SelectionTool', () => {
	it('selection should shrink/grow to bounding box of selected objects', () => {
		const { addTestStrokeCommand } = createSquareStroke();

		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);

		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(0.1, 0.1));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(0.1, 0.1));

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

	it('sending keyboard events to the selected region should move selected items', () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(50);
		const selection = selectionTool.getSelection();
		expect(selection).not.toBeNull();

		// Drag the object
		// (d => move right (d is from WASD controls.))
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'd');
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'd');
		editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'd');

		expect(testStroke.getBBox().topLeft.x).toBeGreaterThan(5);

		editor.history.undo();

		expect(testStroke.getBBox().topLeft).toMatchObject({
			x: 0,
			y: 0,
		});
	});

	it('moving the selection with a keyboard should move the view to keep the selection in view', () => {
		const { editor, selectionTool } = createEditorWithSingleObjectSelection(50);

		const selection = selectionTool.getSelection();
		if (selection === null) {
			// Throw to allow TypeScript's non-null checker to understand that selection
			// must be non-null after this.
			throw new Error('Selection should be non-null.');
		}

		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'a');
		editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'a');
		expect(editor.viewport.visibleRect.containsPoint(selection.region.center)).toBe(true);
	});

	it('shift+click should expand an existing selection', () => {
		const { addTestStrokeCommand: stroke1Command } = createSquareStroke(50);
		const { addTestStrokeCommand: stroke2Command } = createSquareStroke(500);

		const editor = createEditor();
		editor.dispatch(stroke1Command);
		editor.dispatch(stroke2Command);

		// Select the first stroke
		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);

		// Select the smaller rectangle
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(40, 40));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 100));

		expect(selectionTool.getSelectedObjects()).toHaveLength(1);

		// Shift key down.
		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'Shift');

		// Select the larger stroke.
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(200, 200));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(600, 600));

		expect(selectionTool.getSelectedObjects()).toHaveLength(2);

		editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, 'Shift');

		// Select the larger stroke without shift pressed
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(600, 600));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(200, 200));
		expect(selectionTool.getSelectedObjects()).toHaveLength(1);

		// Select nothing
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(2000, 200));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(2001, 201));
		expect(selectionTool.getSelectedObjects()).toHaveLength(0);
	});

	it('should remove the selection from the document while dragging', () => {
		const { editor, selectionTool } = createEditorWithSingleObjectSelection(50);

		const selection = selectionTool.getSelection()!;
		selection.onDragStart(Pointer.ofCanvasPoint(Vec2.of(0, 0), true, editor.viewport));
		jest.advanceTimersByTime(100);
		selection.onDragUpdate(Pointer.ofCanvasPoint(Vec2.of(20, 0), true, editor.viewport));
		jest.advanceTimersByTime(100);

		// Expect the selection to not be in the image while dragging
		expect(editor.image.getAllElements()).toHaveLength(0);

		selection.onDragEnd();

		expect(editor.image.getAllElements()).toHaveLength(1);
	});

	it('should drag objects horizontally', () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(50);

		expect(editor.image.findParent(testStroke)).not.toBeNull();
		expect(testStroke.getBBox().topLeft).objEq(Vec2.of(0, 0));

		const selection = selectionTool.getSelection()!;
		dragSelection(editor, selection, Vec2.of(0, 0), Vec2.of(10, 0));

		expect(editor.image.findParent(testStroke)).not.toBeNull();
		expect(testStroke.getBBox().topLeft).objEq(Vec2.of(10, 0));
	});

	it('should round changes in objects positions when dragging', () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(50);

		expect(editor.image.findParent(testStroke)).not.toBeNull();
		expect(testStroke.getBBox().topLeft).objEq(Vec2.of(0, 0));

		const selection = selectionTool.getSelection()!;
		dragSelection(editor, selection, Vec2.of(0, 0), Vec2.of(9.999, 0));

		expect(editor.image.findParent(testStroke)).not.toBeNull();
		expect(testStroke.getBBox().topLeft).objEq(Vec2.of(10, 0));
	});

	it('rotation handle should rotate the selection', () => {
		const { addTestStrokeCommand: strokeCommand } = createSquareStroke(50);

		const editor = createEditor();
		editor.dispatch(strokeCommand);

		// Select the first stroke
		const selectionTool = getSelectionTool(editor);
		selectionTool.setEnabled(true);
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(40, 40));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 100));

		// Drag the rotate handle, which should be located halfway across
		// the top of the selection box
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(25, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(30, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(0, 25));

		// Rotate 45 degrees:
		//  Drag start (resize circle)
		//     ↓
		// .---o---x ← y=0, drag end
		// |       |
		// |       |
		// |       |
		// .-------.
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(50, 0));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(50, 0));

		expect(selectionTool.getSelectedObjects()).toHaveLength(1);

		// Deselect & add the item back to the editor
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(1250, 0));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(1250, 0));

		expect(selectionTool.getSelectedObjects()).toHaveLength(0);

		const imageStrokes = editor.image.getAllElements();
		expect(imageStrokes).toHaveLength(1);

		const transformedStroke = imageStrokes[0] as Stroke;
		const strokePoints = transformedStroke
			.getPath()
			.polylineApproximation()
			.map((line) => line.p1);

		// One point should now be just above the center of the square:
		//      .  ←
		//   .     .
		//      .
		//
		expect(strokePoints.filter((point) => point.eq(Vec2.of(Math.hypot(25, 0), 0)))).toHaveLength(1);
	});

	it('dragCancel should return a selection to its original position', () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(150);

		const selection = selectionTool.getSelection()!;
		expect(testStroke.getBBox().topLeft).objEq(Vec2.zero);

		selection.onDragStart(Pointer.ofCanvasPoint(Vec2.of(10, 0), true, editor.viewport));
		jest.advanceTimersByTime(100);
		selection.onDragUpdate(Pointer.ofCanvasPoint(Vec2.of(200, 10), true, editor.viewport));
		jest.advanceTimersByTime(100);
		selection.onDragCancel();

		expect(testStroke.getBBox().topLeft).objEq(Vec2.zero);
		expect(editor.image.findParent(testStroke)).not.toBeNull();
	});

	it('duplicateSelectedObjects should duplicate a selection while dragging', async () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(150);

		const selection = selectionTool.getSelection()!;
		selection.onDragStart(Pointer.ofCanvasPoint(Vec2.of(0, 0), true, editor.viewport));
		jest.advanceTimersByTime(100);
		selection.onDragUpdate(Pointer.ofCanvasPoint(Vec2.of(20, 0), true, editor.viewport));

		// The selection should not be in the document while dragging
		expect(editor.image.findParent(testStroke)).toBeNull();

		await editor.dispatch(await selection.duplicateSelectedObjects());
		jest.advanceTimersByTime(100);

		// The duplicate stroke should be added to the document, but the original should not.
		expect(editor.image.findParent(testStroke)).toBeNull();

		const allObjectsInImage = editor.image.getAllElements();
		expect(allObjectsInImage).toHaveLength(1);

		const duplicateObject = allObjectsInImage[0];

		// The duplicate stroke should be translated
		expect(duplicateObject.getBBox()).objEq(new Rect2(20, 0, 150, 150));

		// The duplicate stroke should be selected.
		expect(selection.getSelectedObjects()).toHaveLength(1);

		// The test stroke should not be added to the document
		// (esp if we continue dragging)
		selection.onDragUpdate(Pointer.ofCanvasPoint(Vec2.of(30, 10), true, editor.viewport));
		jest.advanceTimersByTime(100);

		expect(editor.image.findParent(testStroke)).toBeNull();

		// The test stroke should be translated when we finish dragging.
		selection.onDragEnd();

		expect(editor.image.findParent(testStroke)).not.toBeNull();
		expect(testStroke.getBBox()).objEq(new Rect2(30, 10, 150, 150));
	});

	it('should only fire the SelectionChanged event if the selection changed', () => {
		const { editor, selectionTool, testStroke } = createEditorWithSingleObjectSelection(150);

		selectionTool.clearSelection();

		const updatedListener = jest.fn();
		editor.notifier.on(EditorEventType.SelectionUpdated, updatedListener);

		expect(updatedListener).toHaveBeenCalledTimes(0);

		selectionTool.setEnabled(true);
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(10, 10));

		// Should not be notified until the selection ends
		expect(updatedListener).toHaveBeenCalledTimes(0);

		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(5, 5));

		expect(updatedListener).toHaveBeenCalledTimes(1);
		expect(updatedListener).toHaveBeenLastCalledWith({
			kind: EditorEventType.SelectionUpdated,
			tool: selectionTool,
			selectedComponents: [testStroke],
		});

		// Selecting the same content should not re-fire the listener
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(5, 5));

		expect(updatedListener).toHaveBeenCalledTimes(1);

		// ...but selecting a different item should.
		const secondStroke = createSquareStroke(3000); // Large to ensure that we don't drag the selection instead.
		editor.dispatch(secondStroke.addTestStrokeCommand);

		expect(updatedListener).toHaveBeenCalledTimes(1);

		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(2999, 2999));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(3001, 3001));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(3002, 3002));

		expect(updatedListener).toHaveBeenCalledTimes(2);
		expect(updatedListener).toHaveBeenLastCalledWith({
			kind: EditorEventType.SelectionUpdated,
			tool: selectionTool,
			selectedComponents: [secondStroke.testStroke],
		});
	});

	it('should remove the selection box after ending an empty selection', () => {
		const { editor, selectionTool } = createEditorWithSingleObjectSelection(150);

		// Should have a selection when objects are selected
		expect(selectionTool.getSelection()).not.toBe(null);

		// Select nothing
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(2999, 2999));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(3001, 3001));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(3002, 3002));

		// Should not have a selection after setting the selection to contain no objects
		expect(selectionTool.getSelection()).toBe(null);
	});

	it('should make selected objects toplevel on click', () => {
		const { editor, testStroke: selectedStroke } = createEditorWithSingleObjectSelection(150);

		const { addTestStrokeCommand: addOtherStrokeCommand, testStroke: otherStroke } =
			createSquareStroke(40);
		editor.dispatch(addOtherStrokeCommand);

		// otherStroke should initially be below selectedStroke
		expect(selectedStroke.getZIndex()).toBeLessThan(otherStroke.getZIndex());

		const clickLocation = selectedStroke.getBBox().center;
		sendPenEvent(editor, InputEvtType.PointerDownEvt, clickLocation);
		sendPenEvent(editor, InputEvtType.PointerUpEvt, clickLocation);

		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());

		// Undoing should undo changing the z-index
		editor.history.undo();
		expect(selectedStroke.getZIndex()).toBeLessThan(otherStroke.getZIndex());

		// ...and redoing should also work
		editor.history.redo();
		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());
	});

	it('sendToBack should return a serializable command that sends the selection to the back', () => {
		const {
			editor,
			testStroke: selectedStroke,
			selectionTool,
		} = createEditorWithSingleObjectSelection(150);

		// Add another stroke and send it to the back
		const { addTestStrokeCommand: addOtherStrokeCommand, testStroke: otherStroke } =
			createSquareStroke(40);
		editor.dispatch(addOtherStrokeCommand);
		editor.dispatch(otherStroke.setZIndex(-1));
		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());

		// sendToBack should send to the back
		editor.dispatch(selectionTool.getSelection()!.sendToBack()!);
		expect(selectedStroke.getZIndex()).toBeLessThan(otherStroke.getZIndex());

		// Undo should work correctly
		editor.history.undo();
		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());

		// Should be serializable
		const serialized = selectionTool.getSelection()!.sendToBack()!.serialize();
		const deserialized = SerializableCommand.deserialize(serialized, editor);

		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());
		editor.dispatch(deserialized);
		expect(selectedStroke.getZIndex()).toBeLessThan(otherStroke.getZIndex());

		editor.history.undo();
		expect(selectedStroke.getZIndex()).toBeGreaterThan(otherStroke.getZIndex());
		editor.history.redo();
		expect(selectedStroke.getZIndex()).toBeLessThan(otherStroke.getZIndex());
	});
});
