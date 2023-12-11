import Editor from './Editor';
import Command from './commands/Command';
import { EditorEventType, UndoEventType } from './types';

type AnnounceRedoCallback = (command: Command)=>void;
type AnnounceUndoCallback = (command: Command)=>void;

class UndoRedoHistory {
	#undoStack: Command[];
	#redoStack: Command[];

	private readonly maxUndoRedoStackSize: number = 700;

	// @internal
	public constructor(
		private readonly editor: Editor,
		private announceRedoCallback: AnnounceRedoCallback,
		private announceUndoCallback: AnnounceUndoCallback,
	) {
		this.#undoStack = [];
		this.#redoStack = [];
	}

	private fireUpdateEvent(
		stackUpdateType: UndoEventType, triggeringCommand: Command
	) {
		this.editor.notifier.dispatch(EditorEventType.UndoRedoStackUpdated, {
			kind: EditorEventType.UndoRedoStackUpdated,
			undoStackSize: this.#undoStack.length,
			redoStackSize: this.#redoStack.length,

			command: triggeringCommand,
			stackUpdateType,
		});
	}

	// Adds the given command to this and applies it to the editor.
	public push(command: Command, apply: boolean = true) {
		if (apply) {
			command.apply(this.editor);
		}
		this.#undoStack.push(command);

		for (const elem of this.#redoStack) {
			elem.onDrop(this.editor);
		}
		this.#redoStack = [];

		if (this.#undoStack.length > this.maxUndoRedoStackSize) {
			const removeAtOnceCount = Math.ceil(this.maxUndoRedoStackSize / 100);
			const removedElements = this.#undoStack.splice(0, removeAtOnceCount);
			removedElements.forEach(elem => elem.onDrop(this.editor));
		}

		this.fireUpdateEvent(UndoEventType.CommandDone, command);
		this.editor.notifier.dispatch(EditorEventType.CommandDone, {
			kind: EditorEventType.CommandDone,
			command,
		});
	}

	// Remove the last command from this' undo stack and apply it.
	public undo(): void|Promise<void> {
		const command = this.#undoStack.pop();
		if (command) {
			this.#redoStack.push(command);
			const result = command.unapply(this.editor);
			this.announceUndoCallback(command);

			this.fireUpdateEvent(UndoEventType.CommandUndone, command);
			this.editor.notifier.dispatch(EditorEventType.CommandUndone, {
				kind: EditorEventType.CommandUndone,
				command,
			});

			return result;
		}
	}

	public redo(): void|Promise<void> {
		const command = this.#redoStack.pop();
		if (command) {
			this.#undoStack.push(command);
			const result = command.apply(this.editor);
			this.announceRedoCallback(command);

			this.fireUpdateEvent(UndoEventType.CommandRedone, command);
			this.editor.notifier.dispatch(EditorEventType.CommandDone, {
				kind: EditorEventType.CommandDone,
				command,
			});

			return result;
		}
	}

	public get undoStackSize(): number {
		return this.#undoStack.length;
	}

	public get redoStackSize(): number {
		return this.#redoStack.length;
	}
}

export default UndoRedoHistory;
