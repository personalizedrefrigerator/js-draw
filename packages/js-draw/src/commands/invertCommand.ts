import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import Command from './Command';
import SerializableCommand from './SerializableCommand';

// Returns a command that does the opposite of the given command --- `result.apply()` calls
// `command.unapply()` and `result.unapply()` calls `command.apply()`.
const invertCommand = <T extends Command> (command: T): T extends SerializableCommand ? SerializableCommand : Command => {
	if (command instanceof SerializableCommand) {
		// SerializableCommand that does the inverse of [command]
		return new class extends SerializableCommand {
			protected serializeToJSON() {
				return command.serialize();
			}
			public apply(editor: Editor) {
				command.unapply(editor);
			}
			public unapply(editor: Editor) {
				command.apply(editor);
			}
			public override onDrop(editor: Editor) {
				command.onDrop(editor);
			}
			public description(editor: Editor, localizationTable: EditorLocalization): string {
				return localizationTable.inverseOf(command.description(editor, localizationTable));
			}
		}('inverse');
	} else {
		// Command that does the inverse of [command].
		const result = new class extends Command {
			public apply(editor: Editor) {
				command.unapply(editor);
			}

			public unapply(editor: Editor) {
				command.apply(editor);
			}

			public override onDrop(editor: Editor) {
				command.onDrop(editor);
			}

			public description(editor: Editor, localizationTable: EditorLocalization) {
				return localizationTable.inverseOf(command.description(editor, localizationTable));
			}
		};

		// We know that T does not extend SerializableCommand, and thus returning a Command
		// is appropriate.
		return result as any;
	}
};

SerializableCommand.register('inverse', (data, editor) => {
	return invertCommand(SerializableCommand.deserialize(data, editor));
});

export default invertCommand;