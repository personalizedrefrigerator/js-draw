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

export enum ToolType {
	TouchPanZoom,
	Pen,
	Selection,
	Eraser,
	PanZoom,
}

export default class ToolController {
	private tools: BaseTool[];
	private activeTool: BaseTool|null;

	public constructor(editor: Editor, localization: ToolLocalization) {
		const primaryToolEnabledGroup = new ToolEnabledGroup();
		const touchPanZoom = new PanZoom(editor, PanZoomMode.OneFingerGestures, localization.touchPanTool);
		const primaryPenTool = new Pen(editor, localization.penTool(1));
		const primaryTools = [
			new SelectionTool(editor, localization.selectionTool),
			new Eraser(editor, localization.eraserTool),

			// Three pens
			primaryPenTool,
			new Pen(editor, localization.penTool(2), Color4.clay, 8),

			// Highlighter-like pen with width=64
			new Pen(editor, localization.penTool(3), Color4.ofRGBA(1, 1, 0, 0.5), 64),
		];
		this.tools = [
			touchPanZoom,
			...primaryTools,
			new PanZoom(editor, PanZoomMode.TwoFingerGestures | PanZoomMode.AnyDevice, localization.twoFingerPanZoomTool),
		];
		primaryTools.forEach(tool => tool.setToolGroup(primaryToolEnabledGroup));
		touchPanZoom.setEnabled(false);
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
			event.kind === InputEvtType.WheelEvt || event.kind === InputEvtType.KeyPressEvent
		) {
			const isKeyPressEvt = event.kind === InputEvtType.KeyPressEvent;
			const isWheelEvt = event.kind === InputEvtType.WheelEvt;
			for (const tool of this.tools) {
				if (!tool.isEnabled()) {
					continue;
				}

				const wheelResult = isWheelEvt && tool.onWheel(event);
				const keyPressResult = isKeyPressEvt && tool.onKeyPress(event);
				handled = keyPressResult || wheelResult;

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
