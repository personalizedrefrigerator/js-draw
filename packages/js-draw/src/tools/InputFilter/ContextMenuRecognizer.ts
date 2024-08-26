import { InputEvt, InputEvtType, isPointerEvt } from '../../inputEvents';
import InputMapper from './InputMapper';
import StationaryPenDetector, { defaultStationaryDetectionConfig } from '../util/StationaryPenDetector';
import { Point2 } from '@js-draw/math';
import Pointer, { PointerDevice } from '../../Pointer';


export default class ContextMenuRecognizer extends InputMapper {
	private canShowContextMenu = false;
	private contextMenuTriggerPointer: Pointer;
	private contextMenuStartPoint: Point2;
	private stationaryDetector: StationaryPenDetector|null = null;

	public constructor() {
		super();
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
				this.stationaryDetector = new StationaryPenDetector(
					event.current,
					defaultStationaryDetectionConfig,
					sendContextMenuEvent,
				);
			} else {
				this.canShowContextMenu = false;
			}
		} else if (event.kind === InputEvtType.PointerMoveEvt) {
			if (this.canShowContextMenu) {
				this.stationaryDetector?.onPointerMove(event.current);

				const deltaPosition = event.current.screenPos.minus(this.contextMenuStartPoint);
				const threshold = 10;
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
