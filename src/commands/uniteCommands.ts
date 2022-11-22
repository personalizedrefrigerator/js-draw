import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import Command from './Command';
import SerializableCommand from './SerializableCommand';


class NonSerializableUnion extends Command {
	public constructor(private commands: Command[], private applyChunkSize: number|undefined) {
		super();
	}

	private static waitForAll(commands: (Promise<void>|void)[]): Promise<void>|void {
		// If any are Promises...
		if (commands.some(command => command && command['then'])) {
			console.log('waiting...');
			// Wait for all commands to finish.
			return Promise.all(commands)
				// Ensure we return a Promise<void> and not a Promise<void[]>
				.then(() => {});
		}

		return;
	}

	public apply(editor: Editor) {
		if (this.applyChunkSize === undefined) {
			const results = this.commands.map(cmd => cmd.apply(editor));
			return NonSerializableUnion.waitForAll(results);
		} else {
			return editor.asyncApplyCommands(this.commands, this.applyChunkSize);
		}
	}

	public unapply(editor: Editor) {
		if (this.applyChunkSize === undefined) {
			const results = this.commands.map(cmd => cmd.unapply(editor));
			return NonSerializableUnion.waitForAll(results);
		} else {
			return editor.asyncUnapplyCommands(this.commands, this.applyChunkSize);
		}
	}

	public description(editor: Editor, localizationTable: EditorLocalization) {
		const descriptions: string[] = [];

		let lastDescription: string|null = null;
		let duplicateDescriptionCount: number = 0;
		for (const part of this.commands) {
			const description = part.description(editor, localizationTable);
			if (description !== lastDescription && lastDescription !== null) {
				descriptions.push(localizationTable.unionOf(lastDescription, duplicateDescriptionCount));
				lastDescription = null;
				duplicateDescriptionCount = 0;
			}

			duplicateDescriptionCount ++;
			lastDescription ??= description;
		}

		if (duplicateDescriptionCount > 1) {
			descriptions.push(localizationTable.unionOf(lastDescription!, duplicateDescriptionCount));
		} else if (duplicateDescriptionCount === 1) {
			descriptions.push(lastDescription!);
		}

		return descriptions.join(', ');
	}
}

class SerializableUnion extends SerializableCommand {
	private nonserializableCommand: NonSerializableUnion;
	public constructor(private commands: SerializableCommand[], private applyChunkSize: number|undefined) {
		super('union');
		this.nonserializableCommand = new NonSerializableUnion(commands, applyChunkSize);
	}

	protected serializeToJSON() {
		return {
			applyChunkSize: this.applyChunkSize,
			data: this.commands.map(command => command.serialize()),
		};
	}

	public apply(editor: Editor) {
		return this.nonserializableCommand.apply(editor);
	}

	public unapply(editor: Editor) {
		return this.nonserializableCommand.unapply(editor);
	}

	public description(editor: Editor, localizationTable: EditorLocalization): string {
		return this.nonserializableCommand.description(editor, localizationTable);
	}
}

const uniteCommands = <T extends Command> (commands: T[], applyChunkSize?: number): T extends SerializableCommand ? SerializableCommand : Command => {
	let allSerializable = true;
	for (const command of commands) {
		if (!(command instanceof SerializableCommand)) {
			allSerializable = false;
			break;
		}
	}

	if (!allSerializable) {
		return new NonSerializableUnion(commands, applyChunkSize) as any;
	} else {
		const castedCommands = commands as any[] as SerializableCommand[];
		return new SerializableUnion(castedCommands, applyChunkSize);
	}
};

SerializableCommand.register('union', (data: any, editor) => {
	if (typeof data.data.length !== 'number') {
		throw new Error('Unions of commands must serialize to lists of serialization data.');
	}
	const applyChunkSize: number|undefined = data.applyChunkSize;
	if (typeof applyChunkSize !== 'number' && applyChunkSize !== undefined) {
		throw new Error('serialized applyChunkSize is neither undefined nor a number.');
	}

	const commands: SerializableCommand[] = [];
	for (const part of data.data as any[]) {
		commands.push(SerializableCommand.deserialize(part, editor));
	}

	return uniteCommands(commands, applyChunkSize);
});


export default uniteCommands;