import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import waitForAll from '../util/waitForAll';
import Command from './Command';
import SerializableCommand from './SerializableCommand';


class NonSerializableUnion extends Command {
	public constructor(
		private commands: Command[],
		private applyChunkSize: number|undefined,
		private descriptionOverride: string|undefined,
	) {
		super();
	}

	public apply(editor: Editor) {
		if (this.applyChunkSize === undefined) {
			const results = this.commands.map(cmd => cmd.apply(editor));
			return waitForAll(results);
		} else {
			return editor.asyncApplyCommands(this.commands, this.applyChunkSize);
		}
	}

	public unapply(editor: Editor) {
		const commands = [ ...this.commands ];
		commands.reverse();

		if (this.applyChunkSize === undefined) {
			const results = commands.map(cmd => cmd.unapply(editor));
			return waitForAll(results);
		} else {
			return editor.asyncUnapplyCommands(commands, this.applyChunkSize, false);
		}
	}

	public override onDrop(editor: Editor): void {
		this.commands.forEach(command => command.onDrop(editor));
	}

	public description(editor: Editor, localizationTable: EditorLocalization) {
		if (this.descriptionOverride) {
			return this.descriptionOverride;
		}

		const descriptions: string[] = [];

		let lastDescription: string|null = null;
		let duplicateDescriptionCount: number = 0;
		let handledCommandCount: number = 0;
		for (const part of this.commands) {
			const description = part.description(editor, localizationTable);
			if (description !== lastDescription && lastDescription !== null) {
				descriptions.push(localizationTable.unionOf(lastDescription, duplicateDescriptionCount));
				lastDescription = null;
				duplicateDescriptionCount = 0;
			}

			duplicateDescriptionCount ++;
			handledCommandCount ++;
			lastDescription ??= description;

			// Long descriptions aren't very useful to the user.
			const maxDescriptionLength = 12;
			if (descriptions.length > maxDescriptionLength) {
				break;
			}
		}

		if (duplicateDescriptionCount > 1) {
			descriptions.push(localizationTable.unionOf(lastDescription!, duplicateDescriptionCount));
		} else if (duplicateDescriptionCount === 1) {
			descriptions.push(lastDescription!);
		}

		if (handledCommandCount < this.commands.length) {
			descriptions.push(localizationTable.andNMoreCommands(this.commands.length - handledCommandCount));
		}

		return descriptions.join(', ');
	}
}

class SerializableUnion extends SerializableCommand {
	private nonserializableCommand: NonSerializableUnion;
	private serializedData: any;

	public constructor(
		private commands: SerializableCommand[],
		private applyChunkSize: number|undefined,
		private descriptionOverride: string|undefined,
	) {
		super('union');
		this.nonserializableCommand = new NonSerializableUnion(commands, applyChunkSize, descriptionOverride);
	}

	protected serializeToJSON() {
		if (this.serializedData) {
			return this.serializedData;
		}

		return {
			applyChunkSize: this.applyChunkSize,
			data: this.commands.map(command => command.serialize()),
			description: this.descriptionOverride,
		};
	}

	public apply(editor: Editor) {
		// Cache this' serialized form -- applying this may change how commands serialize.
		this.serializedData = this.serializeToJSON();

		return this.nonserializableCommand.apply(editor);
	}

	public unapply(editor: Editor) {
		return this.nonserializableCommand.unapply(editor);
	}

	public override onDrop(editor: Editor): void {
		this.nonserializableCommand.onDrop(editor);
	}

	public description(editor: Editor, localizationTable: EditorLocalization): string {
		return this.nonserializableCommand.description(editor, localizationTable);
	}
}

export interface UniteCommandsOptions {
	applyChunkSize?: number;
	description?: string;
}

/**
 * Creates a single command from `commands`. This is useful when undoing should undo *all* commands
 * in `commands` at once, rather than one at a time.
 *
 * @example
 *
 * ```ts,runnable
 * import { Editor, pathToRenderable, Stroke, uniteCommands } from 'js-draw';
 * import { Path, Color4 } from '@js-draw/math';
 *
 * const editor = new Editor(document.body);
 * editor.addToolbar();
 *
 * // Create strokes!
 * const strokes = [];
 * for (let i = 0; i < 10; i++) {
 *   const renderablePath = pathToRenderable(
 *     Path.fromString(`M0,${i * 10} L100,100 L300,30 z`),
 *     { fill: Color4.transparent, stroke: { color: Color4.red, width: 1, } }
 *   );
 *   strokes.push(new Stroke([ renderablePath ]));
 * }
 *
 * // Convert to commands
 * const addStrokesCommands = strokes.map(stroke => editor.image.addElement(stroke));
 *
 * // Apply all as a single undoable command (try applying each in a loop instead!)
 * await editor.dispatch(uniteCommands(addStrokesCommands));
 *
 * // The second parameter to uniteCommands is for very large numbers of commands, when
 * // applying them shouldn't be done all at once (which would block the UI).
 *
 * // The second parameter to uniteCommands is for very large numbers of commands, when
 * // applying them shouldn't be done all at once (which would block the UI).
 * ```
 */
const uniteCommands = <T extends Command> (commands: T[], options?: UniteCommandsOptions|number): T extends SerializableCommand ? SerializableCommand : Command => {
	let allSerializable = true;
	for (const command of commands) {
		if (!(command instanceof SerializableCommand)) {
			allSerializable = false;
			break;
		}
	}

	let applyChunkSize;
	let description;
	if (typeof options === 'number') {
		applyChunkSize = options;
	} else {
		applyChunkSize = options?.applyChunkSize;
		description = options?.description;
	}

	if (!allSerializable) {
		return new NonSerializableUnion(commands, applyChunkSize, description) as any;
	} else {
		const castedCommands = commands as any[] as SerializableCommand[];
		return new SerializableUnion(castedCommands, applyChunkSize, description);
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
	const description = typeof data.description === 'string' ? data.description : undefined;


	const commands: SerializableCommand[] = [];
	for (const part of data.data as any[]) {
		commands.push(SerializableCommand.deserialize(part, editor));
	}

	return uniteCommands(commands, { applyChunkSize, description });
});


export default uniteCommands;