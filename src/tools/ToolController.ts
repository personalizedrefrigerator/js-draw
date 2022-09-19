import { InputEvtType, InputEvt, EditorEventType } from '../types';
import Editor from '../Editor';
import BaseTool from './BaseTool';
import PanZoom, { PanZoomMode } from './PanZoom';
import Pen from './Pen';
import ToolEnabledGroup from './ToolEnabledGroup';
import Eraser from './Eraser';
import SelectionTool from './SelectionTool';
import Color4 from '../Color4';
import { ToolLocalization } from './localization';
import UndoRedoShortcut from './UndoRedoShortcut';
import TextTool from './TextTool';
import PipetteTool from './PipetteTool';

export enum ToolType {
    Pen,
    Selection,
    Eraser,
    PanZoom,
    Text,
    Shortcut,
    Pipette,
    Other,
}

export default class ToolController {
	private tools: BaseTool[];
	private activeTool: BaseTool|null = null;
	private primaryToolGroup: ToolEnabledGroup;

	/** @internal */
	public constructor(editor: Editor, localization: ToolLocalization) {
		const primaryToolGroup = new ToolEnabledGroup();
		this.primaryToolGroup = primaryToolGroup;

		const panZoomTool = new PanZoom(editor, PanZoomMode.TwoFingerTouchGestures | PanZoomMode.RightClickDrags, localization.touchPanTool);
		const keyboardPanZoomTool = new PanZoom(editor, PanZoomMode.Keyboard, localization.keyboardPanZoom);
		const primaryPenTool = new Pen(editor, localization.penTool(1), { color: Color4.purple, thickness: 16 });
		const primaryTools = [
			new SelectionTool(editor, localization.selectionTool),
			new Eraser(editor, localization.eraserTool),

			// Three pens
			primaryPenTool,
			new Pen(editor, localization.penTool(2), { color: Color4.clay, thickness: 4 }),

			// Highlighter-like pen with width=64
			new Pen(editor, localization.penTool(3), { color: Color4.ofRGBA(1, 1, 0, 0.5), thickness: 64 }),

			new TextTool(editor, localization.textTool, localization),
		];
		this.tools = [
			new PipetteTool(editor, localization.pipetteTool),
			panZoomTool,
			...primaryTools,
			keyboardPanZoomTool,
			new UndoRedoShortcut(editor),
		];
		primaryTools.forEach(tool => tool.setToolGroup(primaryToolGroup));
		panZoomTool.setEnabled(true);
		primaryPenTool.setEnabled(true);

		editor.notifier.on(EditorEventType.ToolEnabled, event => {
			if (event.kind === EditorEventType.ToolEnabled) {
				editor.announceForAccessibility(localization.toolEnabledAnnouncement(event.tool.description));
			}
		});
		editor.notifier.on(EditorEventType.ToolDisabled, event => {
			if (event.kind === EditorEventType.ToolDisabled) {
				editor.announceForAccessibility(localization.toolDisabledAnnouncement(event.tool.description));
			}
		});

		this.activeTool = null;
	}

	// Replaces the current set of tools with `tools`. This should only be done before
	// the creation of the app's toolbar (if using `HTMLToolbar`).
	public setTools(tools: BaseTool[], primaryToolGroup?: ToolEnabledGroup) {
		this.tools = tools;
		this.primaryToolGroup = primaryToolGroup ?? new ToolEnabledGroup();
	}

	// Add a tool that acts like one of the primary tools (only one primary tool can be enabled at a time).
	// This should be called before creating the app's toolbar.
	public addPrimaryTool(tool: BaseTool) {
		tool.setToolGroup(this.primaryToolGroup);
		this.tools.push(tool);
	}

	// Returns true if the event was handled
	public dispatchInputEvent(event: InputEvt): boolean {
		let handled = false;
		if (event.kind === InputEvtType.PointerDownEvt) {
			for (const tool of this.tools) {
				if (tool.isEnabled() && tool.onPointerDown(event)) {
					if (this.activeTool !== tool) {
						this.activeTool?.onGestureCancel();
					}

					this.activeTool = tool;
					handled = true;
					break;
				}
			}
		} else if (event.kind === InputEvtType.PointerUpEvt) {
			this.activeTool?.onPointerUp(event);
			this.activeTool = null;
			handled = true;
		} else if (
			event.kind === InputEvtType.WheelEvt || event.kind === InputEvtType.KeyPressEvent || event.kind === InputEvtType.KeyUpEvent
		) {
			const isKeyPressEvt = event.kind === InputEvtType.KeyPressEvent;
			const isKeyReleaseEvt = event.kind === InputEvtType.KeyUpEvent;
			const isWheelEvt = event.kind === InputEvtType.WheelEvt;
			for (const tool of this.tools) {
				if (!tool.isEnabled()) {
					continue;
				}

				const wheelResult = isWheelEvt && tool.onWheel(event);
				const keyPressResult = isKeyPressEvt && tool.onKeyPress(event);
				const keyReleaseResult = isKeyReleaseEvt && tool.onKeyUp(event);
				handled = keyPressResult || wheelResult || keyReleaseResult;

				if (handled) {
					break;
				}
			}
		} else if (this.activeTool !== null) {
			let allCasesHandledGuard: never;

			switch (event.kind) {
			case InputEvtType.PointerMoveEvt:
				this.activeTool.onPointerMove(event);
				break;
			case InputEvtType.GestureCancelEvt:
				this.activeTool.onGestureCancel();
				this.activeTool = null;
				break;
			default:
				allCasesHandledGuard = event;
				return allCasesHandledGuard;
			}
			handled = true;
		} else {
			handled = false;
		}

		return handled;
	}

	public getMatchingTools(kind: ToolType): BaseTool[] {
		return this.tools.filter(tool => tool.kind === kind);
	}
}

