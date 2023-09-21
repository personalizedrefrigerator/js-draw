/* @jest-environment jsdom */

import Stroke from '../components/Stroke';
import EditorImage from '../image/EditorImage';
import { Path, Color4 } from '@js-draw/math';
import createEditor from '../testing/createEditor';
import { InputEvtType } from '../inputEvents';
import { pathToRenderable } from '../rendering/RenderablePathSpec';

describe('UndoRedoShortcut', () => {
	const testStroke = new Stroke([pathToRenderable(Path.fromString('M0,0L10,10'), { fill: Color4.red })]);
	const addTestStrokeCommand = EditorImage.addElement(testStroke);

	it('ctrl+z should undo', () => {
		const editor = createEditor();
		editor.dispatch(addTestStrokeCommand);
		expect(editor.history.undoStackSize).toBe(1);

		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.KeyPressEvent,
			ctrlKey: true,
			altKey: false,
			shiftKey: false,
			key: 'z',
			code: 'KeyZ',
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
			altKey: false,
			shiftKey: false,
			key: 'z',
			code: 'KeyZ',
		});

		expect(editor.history.undoStackSize).toBe(1);
		expect(editor.history.redoStackSize).toBe(1);

		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.KeyPressEvent,
			ctrlKey: true,
			altKey: false,
			shiftKey: true,
			key: 'Z',
			code: 'KeyZ',
		});

		expect(editor.history.undoStackSize).toBe(2);
		expect(editor.history.redoStackSize).toBe(0);
	});
});