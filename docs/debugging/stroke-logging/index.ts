import * as jsdraw from 'js-draw';
import MaterialIconProvider from '@js-draw/material-icons';
import { DebugToolbarWidget, playInputLog } from '@js-draw/debugging';
import 'js-draw/styles';

const log = document.querySelector('#log') as HTMLTextAreaElement;
const logData: any[] = [];

const updateLog = () => {
	log.value = logData
		.slice()
		.reverse()
		.map((item) => JSON.stringify(item))
		.join(',\n');
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
	// Override and log several internal event handler callbacks
	public override handleHTMLPointerEvent(
		eventType: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
		evt: PointerEvent,
	) {
		const result = super.handleHTMLPointerEvent(eventType, evt);

		const data = {
			eventType,
			currentTime: new Date().getTime(),
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

	protected override handlePaste(event: ClipboardEvent | DragEvent) {
		const result = super.handlePaste(event);
		addToLog({
			eventType: event.type,
			currentTime: Date.now(),
			timeStamp: event.timeStamp,
		});

		return result;
	}

	protected override setPointerCapture(target: HTMLElement, pointer: number) {
		try {
			target.setPointerCapture(pointer);
		} catch (error) {
			// release/setPointerCapture can fail on event playback (when `pointer`
			// isn't actually down anymore)
			console.warn(error);
		}
	}

	protected override releasePointerCapture(target: HTMLElement, pointer: number) {
		try {
			target.releasePointerCapture(pointer);
		} catch (error) {
			console.warn(error);
		}
	}

	private logKeyEvent(htmlEvent: KeyboardEvent, type: string) {
		const data = {
			eventType: type,
			type: htmlEvent.type,
			currentTime: Date.now(),
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

	public override handleHTMLWheelEvent(event: WheelEvent) {
		const result = super.handleHTMLWheelEvent(event);

		addToLog({
			eventType: 'wheel',
			type: event.type,
			currentTime: Date.now(),
			timeStamp: event.timeStamp,

			clientX: event.clientX,
			clientY: event.clientY,
			deltaX: event.deltaX,
			deltaY: event.deltaY,
			deltaZ: event.deltaZ,
			deltaMode: event.deltaMode,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
		});

		return result;
	}
}

const editor = new LoggingEditor(document.body, {
	iconProvider: new MaterialIconProvider(),
	pens: {
		additionalPenTypes: [
			{
				name: 'Polyline',
				id: 'polyline',
				factory: jsdraw.makePolylineBuilder,
			},
		],
	},
});
const toolbar = editor.addToolbar();
toolbar.addWidget(new DebugToolbarWidget(editor));

editor.notifier.on(jsdraw.EditorEventType.CommandDone, (event) => {
	if (event.kind !== jsdraw.EditorEventType.CommandDone) throw new Error('Bad event type.');

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

editor.notifier.on(jsdraw.EditorEventType.ToolEnabled, (event) => {
	if (event.kind !== jsdraw.EditorEventType.ToolEnabled) throw new Error('Wrong event type');

	addToLog({
		eventType: 'toolEnabled',
		description: event.tool.description,
	});
});

editor.notifier.on(jsdraw.EditorEventType.ToolDisabled, (event) => {
	if (event.kind !== jsdraw.EditorEventType.ToolDisabled) throw new Error('Wrong event type');

	addToLog({
		eventType: 'toolDisabled',
		description: event.tool.description,
	});
});

editor.notifier.on(jsdraw.EditorEventType.ToolUpdated, (event) => {
	if (event.kind !== jsdraw.EditorEventType.ToolUpdated) throw new Error('Wrong event type');

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

	await playInputLog(editor, data, rate);
};
playbackButton.onclick = () => playBackLog(1);

log.value = '';
log.placeholder = [
	'Started successfully! Click "Update" to show the log.',
	'',
	'Alternatively, paste an input log into this textbox, then click "play back log".',
].join('\n');

// To facilitate debugging
(window as any).editor = editor;
(window as any).playBackLog = playBackLog;
