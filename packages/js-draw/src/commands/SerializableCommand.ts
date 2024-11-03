import Editor from '../Editor';
import Command from './Command';

export type DeserializationCallback = (
	data: Record<string, any> | any[],
	editor: Editor,
) => SerializableCommand;

/**
 * A command that can be serialized to or deserialized from JSON. To allow a command to be deserialized, {@link SerializableCommand.register}
 * must be called for each {@link SerializableCommand}.
 *
 * This is used to [allow collaborative editing](https://github.com/personalizedrefrigerator/js-draw/tree/main/docs/examples/example-collaborative).
 */
export default abstract class SerializableCommand extends Command {
	readonly #commandTypeId: string;

	/** @param commandTypeId - A unique identifier for this command. */
	public constructor(commandTypeId: string) {
		super();

		if (!(commandTypeId in SerializableCommand.deserializationCallbacks)) {
			throw new Error(
				`Command ${commandTypeId} must have a registered deserialization callback. To do this, call SerializableCommand.register.`,
			);
		}

		this.#commandTypeId = commandTypeId;
	}

	protected abstract serializeToJSON(): string | Record<string, any> | any[];
	private static deserializationCallbacks: Record<string, DeserializationCallback> = {};

	// Convert this command to an object that can be passed to `JSON.stringify`.
	//
	// Do not rely on the stability of the optupt of this function — it can change
	// form without a major version increase.
	public serialize(): Record<string | symbol, any> {
		return {
			data: this.serializeToJSON(),
			commandType: this.#commandTypeId,
		};
	}

	// Convert a `string` containing JSON data (or the output of `JSON.parse`) into a
	// `Command`.
	//
	// Implementations should assume that `data` is untrusted.
	public static deserialize(
		data: string | Record<string, any>,
		editor: Editor,
	): SerializableCommand {
		const json = typeof data === 'string' ? JSON.parse(data) : data;
		const commandType = json.commandType as string;

		if (!(commandType in SerializableCommand.deserializationCallbacks)) {
			throw new Error(`Unrecognised command type ${commandType}!`);
		}

		return SerializableCommand.deserializationCallbacks[commandType](json.data, editor);
	}

	// Register a deserialization callback. This must be called at least once for every subclass of
	// `SerializableCommand`.
	public static register(commandTypeId: string, deserialize: DeserializationCallback) {
		SerializableCommand.deserializationCallbacks[commandTypeId] = deserialize;
	}
}
