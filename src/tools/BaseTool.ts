import { PointerEvtListener, WheelEvt, PointerEvt, EditorNotifier, EditorEventType, KeyPressEvent } from '../types';
import { ToolType } from './ToolController';
import ToolEnabledGroup from './ToolEnabledGroup';

export default abstract class BaseTool implements PointerEvtListener {
	private enabled: boolean = true;
	private group: ToolEnabledGroup|null = null;

	public onPointerDown(_event: PointerEvt): boolean { return false; }
	public onPointerMove(_event: PointerEvt) { }
	public onPointerUp(_event: PointerEvt) { }
	public onGestureCancel() { }

	public abstract readonly kind: ToolType;

	protected constructor(private notifier: EditorNotifier, public readonly description: string) {
	}

	public onWheel(_event: WheelEvt): boolean {
		return false;
	}

	public onKeyPress(_event: KeyPressEvent): boolean {
		return false;
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
}

