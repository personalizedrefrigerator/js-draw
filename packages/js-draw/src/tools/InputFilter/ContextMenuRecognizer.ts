import { InputEvt, InputEvtType, isPointerEvt, PointerEvt } from '../../inputEvents';
import InputMapper from './InputMapper';
import StationaryPenDetector, { defaultStationaryDetectionConfig } from '../util/StationaryPenDetector';
import { Point2 } from '@js-draw/math';
import Pointer, { PointerDevice } from '../../Pointer';


export default class ContextMenuRecognizer extends InputMapper {
	private canShowContextMenu = false;
	private contextMenuTriggerPointer: Pointer;
	private contextMenuStartPoint: Point2;
	private stationaryDetector: StationaryPenDetector|null = null;
	private clickTolerance = 12;

	public constructor() {
		super();
	}

	/**
	 * In general, only certain events (i.e. touchscreens) are expected to be able to
	 * create long-press menus. This method checks whether `event` was generated by
	 * one such device.
	 */
	private canMakeLongPressMenuEvent(event: PointerEvt) {
		const allowedDevices = [
			PointerDevice.Touch,
		];
		return event.allPointers.length === 1 && allowedDevices.includes(event.current.device);
	}

	public override onEvent(event: InputEvt): boolean {
		const sendContextMenuEvent = () => {
			if (!isPointerEvt(event)) return false;

			if (this.canShowContextMenu) {
				const eventHandled = this.emit({
					kind: InputEvtType.ContextMenu,
					screenPos: event.current.screenPos,
					canvasPos: event.current.canvasPos,
				});

				if (eventHandled) {
					this.emit({
						kind: InputEvtType.GestureCancelEvt,
					});
					return true;
				}
			}
			return false;
		};

		if (event.kind === InputEvtType.PointerDownEvt) {
			if (event.allPointers.length === 1) {
				this.canShowContextMenu = true;
				this.contextMenuTriggerPointer = event.current;
				this.contextMenuStartPoint = event.current.screenPos;

				if (this.canMakeLongPressMenuEvent(event)) {
					this.stationaryDetector = new StationaryPenDetector(
						event.current,
						defaultStationaryDetectionConfig,
						sendContextMenuEvent,
					);
				}
			} else {
				this.canShowContextMenu = false;
			}
		} else if (event.kind === InputEvtType.PointerMoveEvt) {
			if (this.canShowContextMenu) {
				this.stationaryDetector?.onPointerMove(event.current);

				// Only clicks/stationary long presses can create context menu events.
				const deltaPosition = event.current.screenPos.minus(this.contextMenuStartPoint);
				const threshold = this.clickTolerance;
				if (deltaPosition.length() > threshold) {
					this.canShowContextMenu = false;
				}
			}
		} else if (event.kind === InputEvtType.PointerUpEvt) {
			this.stationaryDetector?.destroy();

			if (
				this.contextMenuTriggerPointer?.id === event.current.id &&
				this.contextMenuTriggerPointer.device === PointerDevice.RightButtonMouse &&
				sendContextMenuEvent()
			) {
				return true;
			}
		}

		return this.emit(event);
	}
}
