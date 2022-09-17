import Editor from '../Editor';
import Command from './Command';

export type DeserializationCallback = (data: Record<string, any>|any[], editor: Editor) => SerializableCommand;

export default abstract class SerializableCommand extends Command {
	public constructor(private commandTypeId: string) {
		super();

		if (!(commandTypeId in SerializableCommand.deserializationCallbacks)) {
			throw new Error(
				`Command ${commandTypeId} must have a registered deserialization callback. To do this, call SerializableCommand.register.`
			);
		}
	}

	protected abstract serializeToJSON(): string|Record<string, any>|any[];
	private static deserializationCallbacks: Record<string, DeserializationCallback> = {};

	public serialize(): Record<string|symbol, any> {
		return {
			data: this.serializeToJSON(),
			commandType: this.commandTypeId,
		};
	}

	public static deserialize(data: string|Record<string, any>, editor: Editor): SerializableCommand {
		const json = typeof data === 'string' ? JSON.parse(data) : data;
		const commandType = json.commandType as string;

		if (!(commandType in SerializableCommand.deserializationCallbacks)) {
			throw new Error(`Unrecognised command type ${commandType}!`);
		}

		return SerializableCommand.deserializationCallbacks[commandType](json.data, editor);
	}

	public static register(commandTypeId: string, deserialize: DeserializationCallback) {
		SerializableCommand.deserializationCallbacks[commandTypeId] = deserialize;
	}
}
