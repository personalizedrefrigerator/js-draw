import Editor from '../Editor';
import Command from './Command';

type DeserializationCallback = (data: string, editor: Editor) => SerializableCommand;

export default abstract class SerializableCommand extends Command {
	public constructor(private commandTypeId: string) {
		super();

		if (!(commandTypeId in SerializableCommand.deserializationCallbacks)) {
			throw new Error(
				`Command ${commandTypeId} must have a registered deserialization callback. To do this, call SerializableCommand.register.`
			);
		}
	}

	protected abstract serializeToString(): string;
	private static deserializationCallbacks: Record<string, DeserializationCallback> = {};

	public serialize(): string {
		return JSON.stringify({
			data: this.serializeToString(),
			commandType: this.commandTypeId,
		});
	}

	public static deserialize(data: string, editor: Editor): SerializableCommand {
		const json = JSON.parse(data);
		const commandType = json.commandType as string;

		if (!(commandType in SerializableCommand.deserializationCallbacks)) {
			throw new Error(`Unrecognised command type ${commandType}!`);
		}

		return SerializableCommand.deserializationCallbacks[commandType](json.data as string, editor);
	}

	public static register(commandTypeId: string, deserialize: DeserializationCallback) {
		SerializableCommand.deserializationCallbacks[commandTypeId] = deserialize;
	}
}
