import {
	Color4,
	EditorImage,
	Mat33,
	Path,
	SerializableCommand,
	StrokeComponent,
	Vec2,
} from '../lib';
import uniteCommands from './uniteCommands';
import createEditor from '../testing/createEditor';
import { pathToRenderable } from '../rendering/RenderablePathSpec';

describe('uniteCommands', () => {
	it('should be serializable and deserializable', () => {
		const editor = createEditor();
		const stroke = new StrokeComponent([
			pathToRenderable(Path.fromString('m0,0 l10,10 h-2 z'), { fill: Color4.red }),
		]);
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

	it('should limit the maximum description length', () => {
		const editor = createEditor();

		const commands = [];
		for (let i = 0; i < 1000; i++) {
			commands.push(editor.image.addElement(new StrokeComponent([])));
		}

		// Should generate a short description
		expect(uniteCommands(commands).description(editor, editor.localization).length).toBeLessThan(
			1000,
		);
	});

	it('should be possible to override the default uniteCommands description', () => {
		const editor = createEditor();
		const command = uniteCommands([EditorImage.addElement(new StrokeComponent([]))], {
			description: 'Foo',
		});
		expect(command.description(editor, editor.localization)).toBe('Foo');
	});

	it('should serialize and deserialize command descriptions', () => {
		const editor = createEditor();
		const command = uniteCommands(
			[EditorImage.addElement(new StrokeComponent([])), editor.setBackgroundColor(Color4.red)],
			{ description: 'Bar' },
		);

		if (!(command instanceof SerializableCommand))
			throw new Error('Expected command to be serializable');

		const deserialized = SerializableCommand.deserialize(command.serialize(), editor);
		expect(deserialized.description(editor, editor.localization)).toBe('Bar');
	});
});
