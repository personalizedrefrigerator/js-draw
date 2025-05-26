import Duplicate from './Duplicate';
import { Color4, Path } from '@js-draw/math';
import { EditorImage, pathToRenderable, SerializableCommand, Stroke } from '../lib';
import createEditor from '../testing/createEditor';

const getAllStrokeIds = (editorImage: EditorImage) => {
	const strokes = editorImage.getAllComponents().filter((elem) => elem instanceof Stroke);
	return strokes.map((stroke) => stroke.getId());
};

describe('Duplicate', () => {
	test('deserialized Duplicate commands should create clones with the same IDs', async () => {
		const editor = createEditor();

		const stroke = new Stroke([
			pathToRenderable(Path.fromString('m0,0 l10,10 l-10,0'), { fill: Color4.red }),
		]);
		await editor.dispatch(editor.image.addElement(stroke));

		const command = new Duplicate([stroke]);
		command.apply(editor);

		// Should have duplicated [element]
		const strokes1 = getAllStrokeIds(editor.image);
		expect(strokes1).toHaveLength(2);
		// Should not have removed the first element
		expect(strokes1).toContain(stroke.getId());
		// Clone should have a different ID
		expect(strokes1.filter((id) => id !== stroke.getId())).toHaveLength(1);

		// Apply a deserialized copy of the command
		const serialized = command.serialize();
		const deserialized = SerializableCommand.deserialize(serialized, editor);

		command.unapply(editor);
		deserialized.apply(editor);

		// The copy should produce a clone with the same ID
		const strokes2 = getAllStrokeIds(editor.image);
		expect(strokes1).toEqual(strokes2);

		// It should be possible to unapply the deserialized command
		deserialized.unapply(editor);

		expect(getAllStrokeIds(editor.image)).toEqual([stroke.getId()]);
	});
});
