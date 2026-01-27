import { EditorNotifier, EditorEventType } from '../types';
import {
	WheelEvt,
	PointerEvt,
	KeyPressEvent,
	KeyUpEvent,
	PasteEvent,
	CopyEvent,
	InputEvt,
	InputEvtType,
	GestureCancelEvt,
	PointerDownEvt,
	PointerMoveEvt,
	PointerUpEvt,
	ContextMenuEvt,
} from '../inputEvents';
import ToolEnabledGroup from './ToolEnabledGroup';
import InputMapper, { InputEventListener } from './InputFilter/InputMapper';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';
import { DispatcherEventListener } from '../EventDispatcher';

export default abstract class BaseTool implements InputEventListener {
	#enabled: MutableReactiveValue<boolean>;
	#group: ToolEnabledGroup | null = null;

	#inputMapper: InputMapper | null = null;

	#readOnlyEditorChangeListener: DispatcherEventListener | null = null;

	protected constructor(
		private notifier: EditorNotifier,
		public readonly description: string,
	) {
		this.#enabled = ReactiveValue.fromInitialValue(true);
		this.#enabled.onUpdate((enabled) => {
			// Ensure that at most one tool in the group is enabled.
			if (enabled) {
				this.#group?.notifyEnabled(this);
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
		});
	}

	/** Override this to allow this tool to be enabled in a read-only editor */
	public canReceiveInputInReadOnlyEditor() {
		return false;
	}

	public setInputMapper(mapper: InputMapper | null) {
		this.#inputMapper = mapper;
		if (mapper) {
			mapper.setEmitListener((event) => this.dispatchEventToCallback(event));
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
				return this.onPointerMove(event) ?? true;
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
			case InputEvtType.ContextMenu:
				return this.onContextMenu(event);
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
	public onPointerDown(_event: PointerDownEvt): boolean {
		return false;
	}
	public onPointerMove(_event: PointerMoveEvt): boolean | void {}

	/**
	 * Returns true iff there are additional pointers down and the tool should
	 * remain active to handle the additional events.
	 *
	 * For most purposes, this should return `false` or nothing.
	 */
	public onPointerUp(_event: PointerUpEvt): boolean | void {}

	public onGestureCancel(_event: GestureCancelEvt) {}

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

	public onContextMenu(_event: ContextMenuEvt) {
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
		this.#enabled.set(enabled);
	}

	public isEnabled(): boolean {
		return this.#enabled.get();
	}

	/**
	 * Returns a {@link ReactiveValue} that updates based on whether this tool is
	 * enabled.
	 *
	 * @example
	 * ```ts
	 * const tool = new SomeTool();
	 *
	 * // Watch for changes in enabled status
	 * tool.enabledValue().onUpdate(enabled => doSomething(enabled));
	 * ```
	 */
	public enabledValue(): ReactiveValue<boolean> {
		return this.#enabled;
	}

	// Connect this tool to a set of other tools, ensuring that at most one
	// of the tools in the group is enabled.
	public setToolGroup(group: ToolEnabledGroup) {
		if (this.isEnabled()) {
			group.notifyEnabled(this);
		}

		this.#group = group;
	}

	public getToolGroup(): ToolEnabledGroup | null {
		if (this.#group) {
			return this.#group;
		}

		return null;
	}

	// Called when the tool is removed/when the editor is destroyed.
	// Subclasses that override this method **must call super.onDestroy()**.
	public onDestroy() {
		this.#readOnlyEditorChangeListener?.remove();
		this.#readOnlyEditorChangeListener = null;
		this.#group = null;
	}
}
