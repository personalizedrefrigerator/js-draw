/* @jest-environment jsdom */

import Color4 from '../Color4';
import Stroke from '../components/Stroke';
import EditorImage from '../EditorImage';
import Path from '../geometry/Path';
import createEditor from '../testing/createEditor';
import { InputEvtType } from '../types';

describe('UndoRedoShortcut', () => {
	const testStroke = new Stroke([Path.fromString('M0,0L10,10').toRenderable({ fill: Color4.red })]);
	const addTestStrokeCommand = new EditorImage.AddElementCommand(testStroke);

	it('ctrl+z should undo', () => {
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);
		expect(editor.history.undoStackSize).toBe(1);

		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.KeyPressEvent,
			ctrlKey: true,
			key: 'z',
		});
		
		expect(editor.history.undoStackSize).toBe(0);
		expect(editor.history.redoStackSize).toBe(1);
	});

	it('ctrl+shift+Z should re-do', () => {
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);
		editor.dispatch(addTestStrokeCommand);
		expect(editor.history.undoStackSize).toBe(2);

		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.KeyPressEvent,
			ctrlKey: true,
			key: 'z',
		});

		expect(editor.history.undoStackSize).toBe(1);
		expect(editor.history.redoStackSize).toBe(1);

		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.KeyPressEvent,
			ctrlKey: true,
			key: 'Z',
		});

		expect(editor.history.undoStackSize).toBe(2);
		expect(editor.history.redoStackSize).toBe(0);
	});
});