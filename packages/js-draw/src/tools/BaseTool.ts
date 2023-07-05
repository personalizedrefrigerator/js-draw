import { PointerEvtListener, WheelEvt, PointerEvt, EditorNotifier, EditorEventType, KeyPressEvent, KeyUpEvent, PasteEvent, CopyEvent } from '../types';
import ToolEnabledGroup from './ToolEnabledGroup';

export default abstract class BaseTool implements PointerEvtListener {
	private enabled: boolean = true;
	private group: ToolEnabledGroup|null = null;

	/**
	 * Returns true iff the tool handled the event and thus should receive additional
	 * events.
	 */
	public onPointerDown(_event: PointerEvt): boolean { return false; }
	public onPointerMove(_event: PointerEvt) { }

	/**
	 * Returns true iff there are additional pointers down and the tool should
	 * remain active to handle the additional events.
	 *
	 * For most purposes, this should return `false` or nothing.
	 */
	public onPointerUp(_event: PointerEvt): boolean|void { }

	public onGestureCancel() { }

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

