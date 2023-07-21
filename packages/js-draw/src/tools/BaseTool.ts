import { EditorNotifier, EditorEventType } from '../types';
import { WheelEvt, PointerEvt, KeyPressEvent, KeyUpEvent, PasteEvent, CopyEvent, InputEvt, InputEvtType, GestureCancelEvt, PointerDownEvt, PointerMoveEvt, PointerUpEvt } from '../inputEvents';
import ToolEnabledGroup from './ToolEnabledGroup';
import InputMapper, { InputEventListener } from './InputFilter/InputMapper';

export default abstract class BaseTool implements InputEventListener {
	private enabled: boolean = true;
	private group: ToolEnabledGroup|null = null;

	#inputMapper: InputMapper|null = null;

	public setInputMapper(mapper: InputMapper|null) {
		this.#inputMapper = mapper;
		if (mapper) {
			mapper.setEmitListener(event => this.dispatchEventToCallback(event));
		}
	}

	public getInputMapper() {
		return this.#inputMapper;
	}

	private dispatchEventToCallback(event: InputEvt) {
		let exhaustivenessCheck: never;
		switch (event.kind) {
		case InputEvtType.PointerDownEvt:
			return this.onPointerDown(event);
		case InputEvtType.PointerMoveEvt:
			this.onPointerMove(event);
			break;
		case InputEvtType.PointerUpEvt:
			return this.onPointerUp(event) ?? false;
		case InputEvtType.GestureCancelEvt:
			this.onGestureCancel(event);
			break;
		case InputEvtType.WheelEvt:
			return this.onWheel(event);
		case InputEvtType.KeyPressEvent:
			return this.onKeyPress(event);
		case InputEvtType.KeyUpEvent:
			return this.onKeyUp(event);
		case InputEvtType.CopyEvent:
			return this.onCopy(event);
		case InputEvtType.PasteEvent:
			return this.onPaste(event);
		default:
			exhaustivenessCheck = event;
			return exhaustivenessCheck;
		}
		return true;
	}

	// @internal
	public onEvent(event: InputEvt): boolean {
		if (this.#inputMapper) {
			return this.#inputMapper.onEvent(event);
		}
		return this.dispatchEventToCallback(event);
	}

	/**
	 * Returns true iff the tool handled the event and thus should receive additional
	 * events.
	 */
	public onPointerDown(_event: PointerDownEvt): boolean { return false; }
	public onPointerMove(_event: PointerMoveEvt) { }

	/**
	 * Returns true iff there are additional pointers down and the tool should
	 * remain active to handle the additional events.
	 *
	 * For most purposes, this should return `false` or nothing.
	 */
	public onPointerUp(_event: PointerUpEvt): boolean|void { }

	public onGestureCancel(_event: GestureCancelEvt) { }

	protected constructor(private notifier: EditorNotifier, public readonly description: string) {
	}

	public onWheel(_event: WheelEvt): boolean {
		return false;
	}

	public onCopy(_event: CopyEvent): boolean {
		return false;
	}

	public onPaste(_event: PasteEvent): boolean {
		return false;
	}

	public onKeyPress(_event: KeyPressEvent): boolean {
		return false;
	}

	public onKeyUp(_event: KeyUpEvent): boolean {
		return false;
	}

	/**
	 * Return true if, while this tool is active, `_event` can be delivered to
	 * another tool that is higher priority than this.
	 * @internal May be renamed
	 */
	public eventCanBeDeliveredToNonActiveTool(_event: PointerEvt) {
		return true;
	}

	public setEnabled(enabled: boolean) {
		this.enabled = enabled;

		// Ensure that at most one tool in the group is enabled.
		if (enabled) {
			this.group?.notifyEnabled(this);
			this.notifier.dispatch(EditorEventType.ToolEnabled, {
				kind: EditorEventType.ToolEnabled,
				tool: this,
			});
		} else {
			this.notifier.dispatch(EditorEventType.ToolDisabled, {
				kind: EditorEventType.ToolDisabled,
				tool: this,
			});
		}
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	// Connect this tool to a set of other tools, ensuring that at most one
	// of the tools in the group is enabled.
	public setToolGroup(group: ToolEnabledGroup) {
		if (this.isEnabled()) {
			group.notifyEnabled(this);
		}

		this.group = group;
	}

	public getToolGroup(): ToolEnabledGroup|null {
		if (this.group) {
			return this.group;
		}

		return null;
	}
}

