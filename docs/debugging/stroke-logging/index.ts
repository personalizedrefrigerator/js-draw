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

const playbackButton = document.querySelector<HTMLButtonElement>('#playback-btn')!;
playbackButton.style.display = 'none';
log.oninput = () => {
	playbackButton.style.display = '';
};


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

	protected override setPointerCapture(target: HTMLElement, pointer: number) {
		try {
			target.setPointerCapture(pointer);
		} catch(error) {
			console.warn(error);
		}
	}

	protected override releasePointerCapture(target: HTMLElement, pointer: number) {
		try {
			target.releasePointerCapture(pointer);
		} catch(error) {
			console.warn(error);
		}
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

const playBackLog = async (rate: number) => {
	const data = JSON.parse('[' + log.value + ']');
	data.reverse();

	let lastEventTimestamp: number|null = null;
	let encounteredKeyOrPointerDown = false;

	for (const event of data) {
		if (!event.timeStamp) continue;

		lastEventTimestamp ??= event.timeStamp;
		const deltaTime = event.timeStamp - lastEventTimestamp!;

		// Ignore any mouse movement/extraneous events that the
		// user probably doesn't care about.
		if (encounteredKeyOrPointerDown) {
			await new Promise<void>((resolve) => {
				setTimeout(() => resolve(), deltaTime / rate);
			});
		}

		lastEventTimestamp = event.timeStamp;

		if (['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].includes(event.eventType)) {

			const ptrEvent = new PointerEvent(event.eventType, {
				clientX: event.x,
				clientY: event.y,
				x: event.x,
				y: event.y,
				isPrimary: event.isPrimary,
				pointerType: event.pointerType,
				pointerId: event.pointerId,
				buttons: event.buttons,
				pressure: event.pressure,
			} as any);

			editor.handleHTMLPointerEvent(event.eventType, ptrEvent);

		}
		else if (event.eventType === 'keydown' || event.eventType === 'keyup') {
			lastEventTimestamp ??= event.timeStamp;
			const keyEvent = new KeyboardEvent(event.eventType, {
				key: event.key,
				code: event.code,

				ctrlKey: event.ctrlKey,
				altKey: event.altKey,
				metaKey: event.metaKey,
				shiftKey: event.shiftKey,
			});

			if (event.eventType === 'keydown') {
				editor.handleHTMLKeyDownEvent(keyEvent);
			} else {
				editor.handleHTMLKeyUpEvent(keyEvent);
			}
		}

		if (event.eventType === 'keydown' || event.eventType === 'pointerdown') {
			encounteredKeyOrPointerDown = true;
		}
	}
};
playbackButton.onclick = () => playBackLog(1);

log.value = 'Started successfully! Click "Update" to show the log.';

// To facilitate debugging
(window as any).editor = editor;
(window as any).playBackLog = playBackLog;
