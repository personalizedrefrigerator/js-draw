import Editor from './Editor';
import Command from './commands/Command';
import { EditorEventType } from './types';

type AnnounceRedoCallback = (command: Command)=>void;
type AnnounceUndoCallback = (command: Command)=>void;

class UndoRedoHistory {
	private undoStack: Command[];
	private redoStack: Command[];

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
		this.redoStack = [];
		this.fireUpdateEvent();
	}

	// Remove the last command from this' undo stack and apply it.
	public undo() {
		const command = this.undoStack.pop();
		if (command) {
			this.redoStack.push(command);
			command.unapply(this.editor);
			this.announceUndoCallback(command);
		}
		this.fireUpdateEvent();
	}

	public redo() {
		const command = this.redoStack.pop();
		if (command) {
			this.undoStack.push(command);
			command.apply(this.editor);
			this.announceRedoCallback(command);
		}
		this.fireUpdateEvent();
	}
}

export default UndoRedoHistory;