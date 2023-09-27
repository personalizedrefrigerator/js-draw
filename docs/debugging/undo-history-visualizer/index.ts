import * as jsdraw from 'js-draw';
import 'js-draw/styles';

const historyArea: HTMLElement = document.querySelector('#history-container')!;

const editor = new jsdraw.Editor(document.body);

// For debugging
(window as any).editor = editor;


const toolbar = jsdraw.makeEdgeToolbar(editor);
toolbar.addDefaults();

// Add columns to the history display
const undoColumn = document.createElement('div');
const redoColumn = document.createElement('div');
historyArea.replaceChildren(undoColumn, redoColumn);

// Makes an element that gives information about an editor
// command.
const makeCommandDisplay = (command: jsdraw.Command) => {
	const container = document.createElement('details');
	const summary = document.createElement('summary');
	const jsonData = document.createElement('pre');

	summary.innerText = command.description(editor, editor.localization);

	if ((command as any).serialize) {
		jsonData.innerText = JSON.stringify((command as any).serialize());
	} else {
		jsonData.innerText = 'Not a serializable command';
	}

	container.replaceChildren(summary, jsonData);
	return container;
};

const addCommandToColumn = (column: HTMLElement, command: jsdraw.Command) => {
	const wasAtTop = column.scrollTop === 0;

	column.insertAdjacentElement('afterbegin', makeCommandDisplay(command));

	setTimeout(() => {
		if (wasAtTop) {
			column.scrollTop = 0;
		}
	});
};

// Adds a HTML representation of `command` to the visual undo
// stack
const addCommandToUndo = (command: jsdraw.Command) => {
	addCommandToColumn(undoColumn, command);
};

const addCommandToRedo = (command: jsdraw.Command) => {
	addCommandToColumn(redoColumn, command);
};

// Removes the HTML representation of the last-added command from
// the undo stack.
const popFromUndoStack = () => {
	undoColumn.firstChild?.remove();
};

const popFromRedoStack = () => {
	redoColumn.firstChild?.remove();
};

// Removes later entries until `column` has `expectedEntryCount`
// children.
const trimColumnToLength = (column: HTMLElement, expectedEntryCount: number) => {
	const entriesToRemove = column.childElementCount - expectedEntryCount;
	for (let i = 0; i < entriesToRemove; i++) {
		undoColumn.lastChild!.remove();
	}
};

editor.notifier.on(jsdraw.EditorEventType.UndoRedoStackUpdated, event => {
	if (event.kind !== jsdraw.EditorEventType.UndoRedoStackUpdated) {
		return;
	}

	if (!event.command) {
		return;
	}

	if (event.stackUpdateType === jsdraw.UndoEventType.CommandDone) {
		addCommandToUndo(event.command);
		redoColumn.replaceChildren();
	}
	else if (event.stackUpdateType === jsdraw.UndoEventType.CommandUndone) {
		popFromUndoStack();
		addCommandToRedo(event.command);
	}
	else {
		popFromRedoStack();
		addCommandToUndo(event.command);
	}

	trimColumnToLength(undoColumn, event.undoStackSize);
	trimColumnToLength(redoColumn, event.redoStackSize);
});