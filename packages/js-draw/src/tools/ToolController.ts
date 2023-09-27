import { EditorEventType } from '../types';
import { Color4 } from '@js-draw/math';
import Editor from '../Editor';
import BaseTool from './BaseTool';
import PanZoom, { PanZoomMode } from './PanZoom';
import Pen from './Pen';
import ToolEnabledGroup from './ToolEnabledGroup';
import Eraser from './Eraser';
import SelectionTool from './SelectionTool/SelectionTool';
import { ToolLocalization } from './localization';
import UndoRedoShortcut from './UndoRedoShortcut';
import TextTool from './TextTool';
import PipetteTool from './PipetteTool';
import ToolSwitcherShortcut from './ToolSwitcherShortcut';
import PasteHandler from './PasteHandler';
import ToolbarShortcutHandler from './ToolbarShortcutHandler';
import { makePressureSensitiveFreehandLineBuilder } from '../components/builders/PressureSensitiveFreehandLineBuilder';
import FindTool from './FindTool';
import SelectAllShortcutHandler from './SelectionTool/SelectAllShortcutHandler';
import SoundUITool from './SoundUITool';
import InputMapper, { InputEventListener } from './InputFilter/InputMapper';
import { InputEvt, InputEvtType } from '../inputEvents';
import InputPipeline from './InputFilter/InputPipeline';
import InputStabilizer from './InputFilter/InputStabilizer';
import ScrollbarTool from './ScrollbarTool';
import ReactiveValue from '../util/ReactiveValue';

export default class ToolController implements InputEventListener {
	private tools: BaseTool[];
	private activeTool: BaseTool|null = null;
	private primaryToolGroup: ToolEnabledGroup;

	// Form a pipeline that allows filtering/mapping input events.
	private inputPipeline: InputPipeline;
	private isEditorReadOnly: ReactiveValue<boolean>;

	/** @internal */
	public constructor(editor: Editor, localization: ToolLocalization) {
		this.isEditorReadOnly = editor.isReadOnlyReactiveValue();

		this.inputPipeline = new InputPipeline();
		this.inputPipeline.setEmitListener(event => this.onEventInternal(event));

		const primaryToolGroup = new ToolEnabledGroup();
		this.primaryToolGroup = primaryToolGroup;

		const panZoomTool = new PanZoom(editor, PanZoomMode.TwoFingerTouchGestures | PanZoomMode.RightClickDrags, localization.touchPanTool);
		const keyboardPanZoomTool = new PanZoom(editor, PanZoomMode.Keyboard, localization.keyboardPanZoom);
		const primaryPenTool = new Pen(editor, localization.penTool(1), { color: Color4.purple, thickness: 8 });
		const secondaryPenTool = new Pen(editor, localization.penTool(2), { color: Color4.clay, thickness: 4 });

		// Stabilize the secondary pen tool.
		secondaryPenTool.setInputMapper(new InputStabilizer(editor.viewport));

		const primaryTools = [
			// Three pens
			primaryPenTool,
			secondaryPenTool,

			// Highlighter-like pen with width=40
			new Pen(
				editor,
				localization.penTool(3),
				{
					color: Color4.ofRGBA(1, 1, 0, 0.5),
					thickness: 40,
					factory: makePressureSensitiveFreehandLineBuilder
				}
			),

			new Eraser(editor, localization.eraserTool),
			new SelectionTool(editor, localization.selectionTool),
			new TextTool(editor, localization.textTool, localization),
			new PanZoom(editor, PanZoomMode.SinglePointerGestures, localization.anyDevicePanning),
		];

		// Accessibility tools
		const soundExplorer = new SoundUITool(editor, localization.soundExplorer);
		soundExplorer.setEnabled(false);

		this.tools = [
			new ScrollbarTool(editor),
			new PipetteTool(editor, localization.pipetteTool),
			soundExplorer,
			panZoomTool,
			...primaryTools,
			keyboardPanZoomTool,
			new UndoRedoShortcut(editor),
			new ToolbarShortcutHandler(editor),
			new ToolSwitcherShortcut(editor),
			new FindTool(editor),
			new PasteHandler(editor),
			new SelectAllShortcutHandler(editor),
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
	// the creation of the app's toolbar (if using `AbstractToolbar`).
	public setTools(tools: BaseTool[], primaryToolGroup?: ToolEnabledGroup) {
		this.tools = tools;
		this.primaryToolGroup = primaryToolGroup ?? new ToolEnabledGroup();
	}

	// Add a tool that acts like one of the primary tools (only one primary tool can be enabled at a time).
	// This should be called before creating the app's toolbar.
	public addPrimaryTool(tool: BaseTool) {
		tool.setToolGroup(this.primaryToolGroup);
		if (tool.isEnabled()) {
			this.primaryToolGroup.notifyEnabled(tool);
		}

		this.addTool(tool);
	}

	public getPrimaryTools(): BaseTool[] {
		return this.tools.filter(tool => {
			return tool.getToolGroup() === this.primaryToolGroup;
		});
	}

	// Add a tool to the end of this' tool list (the added tool receives events after tools already added to this).
	// This should be called before creating the app's toolbar.
	public addTool(tool: BaseTool) {
		this.tools.push(tool);
	}

	// @internal use `dispatchEvent` rather than calling `onEvent` directly.
	private onEventInternal(event: InputEvt): boolean {
		const isEditorReadOnly = this.isEditorReadOnly.get();
		const canToolReceiveInput = (tool: BaseTool) => {
			return tool.isEnabled() && (!isEditorReadOnly || tool.canReceiveInputInReadOnlyEditor());
		};

		let handled = false;
		if (event.kind === InputEvtType.PointerDownEvt) {
			let canOnlySendToActiveTool = false;
			if (this.activeTool && !this.activeTool.eventCanBeDeliveredToNonActiveTool(event)) {
				canOnlySendToActiveTool = true;
			}

			for (const tool of this.tools) {
				if (canOnlySendToActiveTool && tool !== this.activeTool) {
					continue;
				}

				if (canToolReceiveInput(tool) && tool.onEvent(event)) {
					if (this.activeTool !== tool) {
						this.activeTool?.onEvent({ kind: InputEvtType.GestureCancelEvt });
					}

					this.activeTool = tool;
					handled = true;
					break;
				}
			}
		} else if (event.kind === InputEvtType.PointerUpEvt) {
			const upResult = this.activeTool?.onEvent(event);
			const continueHandlingEvents = upResult && event.allPointers.length > 1;

			// Should the active tool continue handling events (without an additional pointer down?)
			if (!continueHandlingEvents) {
				// No -- Remove the current tool
				this.activeTool = null;
			}
			handled = true;
		} else if (event.kind === InputEvtType.PointerMoveEvt) {
			if (this.activeTool !== null) {
				this.activeTool.onEvent(event);
				handled = true;
			}
		} else if (event.kind === InputEvtType.GestureCancelEvt) {
			if (this.activeTool !== null) {
				this.activeTool.onEvent(event);
				this.activeTool = null;
			}
		} else {
			for (const tool of this.tools) {
				if (!canToolReceiveInput(tool)) {
					continue;
				}

				handled = tool.onEvent(event);
				if (handled) {
					break;
				}
			}
		}

		return handled;
	}

	/** Alias for {@link dispatchInputEvent}. */
	public onEvent(event: InputEvt) {
		return this.dispatchInputEvent(event);
	}

	// Returns true if the event was handled.
	public dispatchInputEvent(event: InputEvt): boolean {
		// Feed the event through the input pipeline
		return this.inputPipeline.onEvent(event);
	}

	/**
	 * Adds a new `InputMapper` to this' input pipeline.
	 *
	 * A `mapper` is really a relation that maps each event to no, one,
	 * or many other events.
	 *
	 * @see {@link InputMapper}.
	 */
	public addInputMapper(mapper: InputMapper) {
		this.inputPipeline.addToTail(mapper);
	}

	public getMatchingTools<Type extends BaseTool>(type: new (...args: any[])=>Type): Type[] {
		return this.tools.filter(tool => tool instanceof type) as Type[];
	}

	// @internal
	public onEditorDestroyed() {
		for (const tool of this.tools) {
			tool.onDestroy();
		}
	}
}

