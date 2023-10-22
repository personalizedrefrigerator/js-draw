import * as jsdraw from 'js-draw';
import 'js-draw/styles';

const log = document.querySelector('#log') as HTMLTextAreaElement;
const logData: any[] = [];

const updateLog = () => {
	log.value = (
		logData.slice().reverse().map(item => JSON.stringify(item)).join(', ')
	);
};

const autoUpdateLogCheckbox = document.querySelector<HTMLInputElement>('input#live-update')!;
const addToLog = (data: any) => {
	logData.push(data);
	if (autoUpdateLogCheckbox.checked) {
		updateLog();
	}
};
autoUpdateLogCheckbox.oninput = () => updateLog();


class LoggingEditor extends jsdraw.Editor {
	public override handleHTMLPointerEvent(eventType: 'pointerdown'|'pointermove'|'pointerup'|'pointercancel', evt: PointerEvent) {
		const result = super.handleHTMLPointerEvent(eventType, evt);

		const data = {
			eventType,
			currentTime: (new Date().getTime()),
			timeStamp: evt.timeStamp,

			x: evt.clientX,
			y: evt.clientY,
			isPrimary: evt.isPrimary,
			pointerType: evt.pointerType,
			pointerId: evt.pointerId,
			buttons: evt.buttons,
			pressure: evt.pressure,
		};

		addToLog(data);

		return result;
	}

	private logKeyEvent(htmlEvent: KeyboardEvent, type: string) {
		const data = {
			eventType: type,
			type: htmlEvent.type,
			currentTime: (new Date().getTime()),
			timeStamp: htmlEvent.timeStamp,

			key: htmlEvent.key,
			code: htmlEvent.code,

			ctrlKey: htmlEvent.ctrlKey,
			altKey: htmlEvent.altKey,
			metaKey: htmlEvent.metaKey,
			shiftKey: htmlEvent.shiftKey,
		};

		addToLog(data);
	}

	public override handleHTMLKeyDownEvent(htmlEvent: KeyboardEvent) {
		const result = super.handleHTMLKeyDownEvent(htmlEvent);
		this.logKeyEvent(htmlEvent, 'keydown');
		return result;
	}

	public override handleHTMLKeyUpEvent(htmlEvent: KeyboardEvent) {
		const result = super.handleHTMLKeyUpEvent(htmlEvent);
		this.logKeyEvent(htmlEvent, 'keyup');
		return result;
	}
}

const editor = new LoggingEditor(document.body);
const defaultLayout = true;
editor.addToolbar(defaultLayout);

editor.notifier.on(jsdraw.EditorEventType.CommandDone, event => {
	if (event.kind !== jsdraw.EditorEventType.CommandDone) throw '';

	const description = event.command.description(editor, editor.localization).replace(/\t/g, ' ');
	let serialized = undefined;

	if (event.command instanceof jsdraw.SerializableCommand) {
		serialized = event.command.serialize();
	}

	addToLog({
		eventType: 'commandDone',
		description,
		serialized,
	});
});

editor.notifier.on(jsdraw.EditorEventType.ToolEnabled, event => {
	if (event.kind !== jsdraw.EditorEventType.ToolEnabled) throw '';

	addToLog({
		eventType: 'toolEnabled',
		description: event.tool.description,
	});
});

editor.notifier.on(jsdraw.EditorEventType.ToolDisabled, event => {
	if (event.kind !== jsdraw.EditorEventType.ToolDisabled) throw '';

	addToLog({
		eventType: 'toolDisabled',
		description: event.tool.description,
	});
});

editor.notifier.on(jsdraw.EditorEventType.ToolUpdated, event => {
	if (event.kind !== jsdraw.EditorEventType.ToolUpdated) throw '';

	addToLog({
		eventType: 'toolUpdated',
		description: event.tool.description,
	});
});

const updateButton = document.querySelector<HTMLButtonElement>('#update-btn')!;
updateButton.onclick = () => {
	updateLog();
};

const clearButton = document.querySelector<HTMLButtonElement>('#clear-btn')!;
clearButton.onclick = () => {
	while (logData.length > 0) {
		logData.pop();
	}

	updateLog();
};

log.value = 'Started successfully! Click "Update" to show the log.';

// To facilitate debugging
(window as any).editor = editor;

