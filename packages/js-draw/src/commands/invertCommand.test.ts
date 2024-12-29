import createEditor from '../testing/createEditor';
import invertCommand from './invertCommand';
import Command from './Command';
import Stroke from '../components/Stroke';
import { Color4, Path } from '@js-draw/math';
import { pathToRenderable } from '../rendering/RenderablePathSpec';
import SerializableCommand from './SerializableCommand';
import Erase from './Erase';

class MockCommand extends Command {
	apply = jest.fn();
	unapply = jest.fn();
	description = () => 'test';
}

describe('invertCommand', () => {
	test('should return a command that swaps .apply and .unapply', () => {
		const editor = createEditor();

		const baseCommand = new MockCommand();
		const inverted = invertCommand(baseCommand);

		inverted.apply(editor);
		expect(baseCommand.apply).toHaveBeenCalledTimes(0);
		expect(baseCommand.unapply).toHaveBeenCalledTimes(1);

		inverted.unapply(editor);
		expect(baseCommand.apply).toHaveBeenCalledTimes(1);
		expect(baseCommand.unapply).toHaveBeenCalledTimes(1);
	});

	test('should be serializable', () => {
		const editor = createEditor();
		const testComponent = new Stroke([
			pathToRenderable(Path.fromString('m0,0 l10,10'), { fill: Color4.red }),
		]);
		editor.image.addElement(testComponent).apply(editor);

		const testCommand = new Erase([testComponent]);
		const inverted = invertCommand(testCommand);
		const unserialized = SerializableCommand.deserialize(inverted.serialize(), editor);

		testCommand.apply(editor);
		expect(editor.image.getAllElements()).toHaveLength(0);

		// The unserialized command should unapply testCommand
		unserialized.apply(editor);
		expect(editor.image.getAllElements()).toHaveLength(1);
		// ...then reapply it
		unserialized.unapply(editor);
		expect(editor.image.getAllElements()).toHaveLength(0);
	});
});
