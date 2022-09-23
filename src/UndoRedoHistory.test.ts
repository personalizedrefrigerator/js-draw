
import { Color4, EditorImage, Path, Stroke, Mat33, Vec2 } from './lib';
import createEditor from './testing/createEditor';

describe('UndoRedoHistory', () => {
	it('should keep history size below maximum', () => {
		const editor = createEditor();
		const stroke = new Stroke([ Path.fromString('m0,0 10,10').toRenderable({ fill: Color4.red }) ]);
		editor.dispatch(EditorImage.addElement(stroke));

		for (let i = 0; i < editor.history['maxUndoRedoStackSize'] + 10; i++) {
			editor.dispatch(stroke.transformBy(Mat33.translation(Vec2.of(1, 1))));
		}

		expect(editor.history.undoStackSize).toBeLessThan(editor.history['maxUndoRedoStackSize']);
		expect(editor.history.undoStackSize).toBeGreaterThan(editor.history['maxUndoRedoStackSize'] / 10);
		expect(editor.history.redoStackSize).toBe(0);

		const origUndoStackSize = editor.history.undoStackSize;
		while (editor.history.undoStackSize > 0) {
			editor.history.undo();
		}

		// After undoing as much as possible, the stroke should still be present
		expect(editor.image.findParent(stroke)).not.toBe(null);

		// Undoing again shouldn't cause issues.
		editor.history.undo();
		expect(editor.image.findParent(stroke)).not.toBe(null);

		expect(editor.history.redoStackSize).toBe(origUndoStackSize);
	});
});