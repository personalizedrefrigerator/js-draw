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

		log.value = `${new Date().getTime()},${evt.timeStamp}\t${eventType}: ${JSON.stringify(data)}\n\n` + log.value;

		return result;
	}

}

const editor = new LoggingEditor(document.body);
const defaultLayout = true;
editor.addToolbar(defaultLayout);

editor.notifier.on(jsdraw.EditorEventType.CommandDone, command => {
	log.value = `Done: ${command.kind}\n\n` + log.value;
});

log.value = 'Started successfully!';

