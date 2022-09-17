import Editor from './Editor';
import Command from './commands/Command';
import { EditorEventType } from './types';

type AnnounceRedoCallback = (command: Command)=>void;
type AnnounceUndoCallback = (command: Command)=>void;

class UndoRedoHistory {
	private undoStack: Command[];
	private redoStack: Command[];

	// @internal
	public constructor(
		private readonly editor: Editor,
		private announceRedoCallback: AnnounceRedoCallback,
		private announceUndoCallback: AnnounceUndoCallback,
	) {
		this.undoStack = [];
		this.redoStack = [];
	}

	private fireUpdateEvent() {
		this.editor.notifier.dispatch(EditorEventType.UndoRedoStackUpdated, {
			kind: EditorEventType.UndoRedoStackUpdated,
			undoStackSize: this.undoStack.length,
			redoStackSize: this.redoStack.length,
		});
	}

	// Adds the given command to this and applies it to the editor.
	public push(command: Command, apply: boolean = true) {
		if (apply) {
			command.apply(this.editor);
		}
		this.undoStack.push(command);

		for (const elem of this.redoStack) {
			elem.onDrop(this.editor);
		}
		this.redoStack = [];

		this.fireUpdateEvent();
		this.editor.notifier.dispatch(EditorEventType.CommandDone, {
			kind: EditorEventType.CommandDone,
			command,
		});
	}

	// Remove the last command from this' undo stack and apply it.
	public undo() {
		const command = this.undoStack.pop();
		if (command) {
			this.redoStack.push(command);
			command.unapply(this.editor);
			this.announceUndoCallback(command);

			this.fireUpdateEvent();
			this.editor.notifier.dispatch(EditorEventType.CommandUndone, {
				kind: EditorEventType.CommandUndone,
				command,
			});
		}
	}

	public redo() {
		const command = this.redoStack.pop();
		if (command) {
			this.undoStack.push(command);
			command.apply(this.editor);
			this.announceRedoCallback(command);

			this.fireUpdateEvent();
			this.editor.notifier.dispatch(EditorEventType.CommandDone, {
				kind: EditorEventType.CommandDone,
				command,
			});
		}
	}

	public get undoStackSize(): number {
		return this.undoStack.length;
	}

	public get redoStackSize(): number {
		return this.redoStack.length;
	}
}

export default UndoRedoHistory;
