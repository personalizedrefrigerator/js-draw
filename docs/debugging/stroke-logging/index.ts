import * as jsdraw from 'js-draw';
import 'js-draw/styles';

const log = document.querySelector('#log') as HTMLTextAreaElement;

class LoggingEditor extends jsdraw.Editor {
	public override handleHTMLPointerEvent(eventType: 'pointerdown'|'pointermove'|'pointerup'|'pointercancel', evt: PointerEvent) {
		const result = super.handleHTMLPointerEvent(eventType, evt);

		const data = {
			x: evt.clientX,
			y: evt.clientY,
			primary: evt.isPrimary,
			type: evt.pointerType,
			id: evt.pointerId,
			buttons: evt.buttons,
			pressure: evt.pressure,
		};

		log.value = `${eventType}\t${new Date().getTime()},${evt.timeStamp}:\t${JSON.stringify(data)}\n\n` + log.value;

		return result;
	}

}

const editor = new LoggingEditor(document.body);
const defaultLayout = true;
editor.addToolbar(defaultLayout);

editor.notifier.on(jsdraw.EditorEventType.CommandDone, event => {
	if (event.kind !== jsdraw.EditorEventType.CommandDone) throw '';

	const description = event.command.description(editor, editor.localization).replace(/\t/g, ' ');
	let message = `CommandDone:\t${description}`;

	if (event.command instanceof jsdraw.SerializableCommand) {
		message += `\t${JSON.stringify(event.command.serialize())}`;
	}

	log.value = `${message}\n\n` + log.value;
});

editor.notifier.on(jsdraw.EditorEventType.ToolEnabled, event => {
	if (event.kind !== jsdraw.EditorEventType.ToolEnabled) throw '';

	log.value = `Enabled\t${event.tool.description}\n\n` + log.value;
});

editor.notifier.on(jsdraw.EditorEventType.ToolDisabled, event => {
	if (event.kind !== jsdraw.EditorEventType.ToolDisabled) throw '';

	log.value = `Disabled\t${event.tool.description}\n\n` + log.value;
});

log.value = 'Started successfully!';

