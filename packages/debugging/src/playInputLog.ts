import { Editor } from 'js-draw';

//
// See /docs/debugging/stroke-logging
//
const playInputLog = async (editor: Editor, data: any[], rate: number | undefined) => {
	let lastEventTimestamp: number | null = null;
	let encounteredSignificantEvent = false;

	for (const event of data) {
		if (!event.timeStamp) continue;

		lastEventTimestamp ??= event.timeStamp;
		const deltaTime = event.timeStamp - lastEventTimestamp!;

		// Ignore any mouse movement/extraneous events that the
		// user probably doesn't care about.
		if (encounteredSignificantEvent) {
			if (rate !== undefined) {
				await new Promise<void>((resolve) => {
					setTimeout(() => resolve(), deltaTime / rate);
				});
			}
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
			(ptrEvent as any).setP = event.timeStamp;

			editor.handleHTMLPointerEvent(event.eventType, ptrEvent);
		} else if (event.eventType === 'keydown' || event.eventType === 'keyup') {
			lastEventTimestamp ??= event.timeStamp;
			const keyEvent = new KeyboardEvent(event.eventType, {
				key: event.key,
				code: event.code,

				ctrlKey: event.ctrlKey,
				altKey: event.altKey,
				metaKey: event.metaKey,
				shiftKey: event.shiftKey,
			});
			(keyEvent as any).timeStamp = event.timeStamp;

			if (event.eventType === 'keydown') {
				editor.handleHTMLKeyDownEvent(keyEvent);
			} else {
				editor.handleHTMLKeyUpEvent(keyEvent);
			}
		} else if (event.eventType === 'wheel') {
			lastEventTimestamp ??= event.timeStamp;
			const wheelEvent = new WheelEvent(event.eventType, {
				clientX: event.clientX,
				clientY: event.clientY,
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaZ: event.deltaZ,
				deltaMode: event.deltaMode,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
			});
			(wheelEvent as any).timeStamp = event.timeStamp;

			editor.handleHTMLWheelEvent(wheelEvent);
		}

		if (['wheel', 'keydown', 'pointerdown'].includes(event.eventType)) {
			encounteredSignificantEvent = true;
		}
	}
};

export default playInputLog;
