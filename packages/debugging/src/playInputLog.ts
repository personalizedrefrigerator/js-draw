import { Editor, Rect2, Vec2 } from 'js-draw';

interface BaseLogRecord {
	currentTime: number; // ms
	timeStamp: number; // seconds (fractional)

	ctrlKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
}

interface PointerEventLogRecord extends BaseLogRecord {
	eventType: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';
	pointerType: string;
	pointerId: number;
	buttons: number;
	pressure: number;
	isPrimary: boolean;
	x: number;
	y: number;
}

interface KeyboardEventLogRecord extends BaseLogRecord {
	eventType: 'keydown' | 'keyup';
	key: string;
	code: string;
}

interface WheelEventLogRecord extends BaseLogRecord {
	eventType: 'wheel';
	deltaX: number;
	deltaY: number;
	deltaZ: number;
	deltaMode: number;

	clientX: number;
	clientY: number;
}

export type LogEventRecord = PointerEventLogRecord | KeyboardEventLogRecord | WheelEventLogRecord;

const isPointerEventRecord = (event: LogEventRecord): event is PointerEventLogRecord => {
	return ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].includes(event.eventType);
};

class ExtendedPointerEvent extends PointerEvent {
	private timeStamp_: number;
	public readonly __mockEvent = true;

	public constructor(type: string, init: PointerEventInit, timeStamp: number) {
		super(type, init);
		this.timeStamp_ = timeStamp;
	}

	// This needs to be a getter method to avoid a
	// "TypeError: setting getter-only property" error.
	public override get timeStamp() {
		return this.timeStamp_;
	}
}

export interface InputLogOptions {
	rate?: number | undefined;
	offset?: Vec2;
}

//
// See /docs/debugging/stroke-logging
//
const playInputLog = async (
	editor: Editor,
	data: LogEventRecord[],
	{ rate, offset = Vec2.zero }: InputLogOptions = {},
) => {
	let lastEventTimestamp: number | null = null;
	let encounteredSignificantEvent = false;

	const perfData = {
		timeDeltas: [] as number[],
		totalTime: 0,
		avgTimePerEvent: 0,
	};
	const trackPerf = (callback: () => void) => {
		const startTime = performance.now();
		callback();
		const deltaTime = performance.now() - startTime;

		perfData.timeDeltas.push(deltaTime);
		perfData.totalTime += deltaTime;
		perfData.avgTimePerEvent = perfData.totalTime / perfData.timeDeltas.length;
	};

	const getEditorTopLeft = () => Rect2.of(editor.getRootElement().getBoundingClientRect()).topLeft;

	const initialEditorLocation = getEditorTopLeft();
	for (const event of data) {
		if (!event.timeStamp) continue;

		lastEventTimestamp ??= event.timeStamp;
		const deltaTime = event.timeStamp - lastEventTimestamp;

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

		const modifiers = {
			metaKey: event.metaKey,
			shiftKey: event.shiftKey,
			altKey: event.altKey,
			ctrlKey: event.ctrlKey,
		};

		// Handle the case where the editor moves while playing back the
		// input log. Adjust the input (x,y) for any change in editor location.
		const locationAdjust = initialEditorLocation.minus(getEditorTopLeft()).plus(offset);
		const adjustX = (x: number | undefined) => {
			return typeof x === 'number' ? x - locationAdjust.x : x;
		};
		const adjustY = (y: number | undefined) => {
			return typeof y === 'number' ? y - locationAdjust.y : y;
		};

		if (isPointerEventRecord(event)) {
			const options = {
				clientX: adjustX(event.x),
				clientY: adjustY(event.y),
				x: adjustX(event.x),
				y: adjustY(event.y),
				isPrimary: event.isPrimary,
				pointerType: event.pointerType,
				pointerId: event.pointerId,
				buttons: event.buttons,
				pressure: event.pressure,
				...modifiers,
			};
			const ptrEvent = new ExtendedPointerEvent(event.eventType, options, event.timeStamp);

			trackPerf(() => {
				editor.handleHTMLPointerEvent(event.eventType, ptrEvent);
			});
		} else if (event.eventType === 'keydown' || event.eventType === 'keyup') {
			lastEventTimestamp ??= event.timeStamp;
			const keyEvent = new KeyboardEvent(event.eventType, {
				key: event.key,
				code: event.code,

				...modifiers,
			});
			(keyEvent as any).timeStamp = event.timeStamp;

			if (event.eventType === 'keydown') {
				trackPerf(() => editor.handleHTMLKeyDownEvent(keyEvent));
			} else {
				trackPerf(() => editor.handleHTMLKeyUpEvent(keyEvent));
			}
		} else if (event.eventType === 'wheel') {
			lastEventTimestamp ??= event.timeStamp;
			const wheelEvent = new WheelEvent(event.eventType, {
				clientX: adjustX(event.clientX),
				clientY: adjustY(event.clientY),
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaZ: event.deltaZ,
				deltaMode: event.deltaMode,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
			});
			(wheelEvent as any).timeStamp = event.timeStamp;

			trackPerf(() => editor.handleHTMLWheelEvent(wheelEvent));
		}

		if (['wheel', 'keydown', 'pointerdown'].includes(event.eventType)) {
			encounteredSignificantEvent = true;
		}
	}

	return {
		perfData,
	};
};

export default playInputLog;
