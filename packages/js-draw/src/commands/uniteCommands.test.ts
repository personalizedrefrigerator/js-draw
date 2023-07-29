import { Color4, EditorImage, Mat33, Path, SerializableCommand, StrokeComponent, Vec2 } from '../lib';
import uniteCommands from './uniteCommands';
import createEditor from '../testing/createEditor';
import { pathToRenderable } from '../rendering/RenderablePathSpec';

describe('uniteCommands', () => {
	it('should be serializable and deserializable', () => {
		const editor = createEditor();
		const stroke = new StrokeComponent([ pathToRenderable(Path.fromString('m0,0 l10,10 h-2 z'), { fill: Color4.red }) ]);
		const union = uniteCommands([
			EditorImage.addElement(stroke),
			stroke.transformBy(Mat33.translation(Vec2.of(1, 10))),
		]);
		const deserialized = SerializableCommand.deserialize(union.serialize(), editor);

		deserialized.apply(editor);

		const lookupResult = editor.image.lookupElement(stroke.getId());
		expect(lookupResult).not.toBeNull();
		expect(lookupResult?.getBBox().topLeft).toMatchObject(Vec2.of(1, 10));
		expect(lookupResult?.getBBox().bottomRight).toMatchObject(Vec2.of(11, 20));
	});
});
