import Color4 from '../Color4';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Pointer, { PointerDevice } from '../Pointer';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import { EditorEventType, KeyPressEvent, PointerEvt, StrokeDataPoint } from '../types';
import BaseTool from './BaseTool';
import { ComponentBuilder, ComponentBuilderFactory } from '../components/builders/types';
import { undoKeyboardShortcutId } from './keybindings';
import { decreaseSizeKeyboardShortcutId, increaseSizeKeyboardShortcutId } from './keybindings';



export interface PenStyle {
	color: Color4;
	thickness: number;
}

export default class Pen extends BaseTool {
	protected builder: ComponentBuilder|null = null;
	private lastPoint: StrokeDataPoint|null = null;
	private startPoint: StrokeDataPoint|null = null;
	private currentDeviceType: PointerDevice|null = null;

	public constructor(
		private editor: Editor,
		description: string,
		private style: PenStyle,
		private builderFactory: ComponentBuilderFactory = makeFreehandLineBuilder,
	) {
		super(editor.notifier, description);
	}

	private getPressureMultiplier() {
		return 1 / this.editor.viewport.getScaleFactor() * this.style.thickness;
	}

	// Converts a `pointer` to a `StrokeDataPoint`.
	protected toStrokePoint(pointer: Pointer): StrokeDataPoint {
		const minPressure = 0.3;
		let pressure = Math.max(pointer.pressure ?? 1.0, minPressure);

		if (!isFinite(pressure)) {
			console.warn('Non-finite pressure!', pointer);
			pressure = minPressure;
		}
		console.assert(isFinite(pointer.canvasPos.length()), 'Non-finite canvas position!');
		console.assert(isFinite(pointer.screenPos.length()), 'Non-finite screen position!');
		console.assert(isFinite(pointer.timeStamp), 'Non-finite timeStamp on pointer!');

		const pos = pointer.canvasPos;

		return {
			pos,
			width: pressure * this.getPressureMultiplier(),
			color: this.style.color,
			time: pointer.timeStamp,
		};
	}

	// Displays the stroke that is currently being built with the display's `wetInkRenderer`.
	protected previewStroke() {
		this.editor.clearWetInk();
		this.builder?.preview(this.editor.display.getWetInkRenderer());
	}

	// Throws if no stroke builder exists.
	protected addPointToStroke(point: StrokeDataPoint) {
		if (!this.builder) {
			throw new Error('No stroke is currently being generated.');
		}
		this.builder.addPoint(point);
		this.lastPoint = point;
		this.previewStroke();
	}

	public override onPointerDown(event: PointerEvt): boolean {
		const { current, allPointers } = event;
		const isEraser = current.device === PointerDevice.Eraser;

		let anyDeviceIsStylus = false;
		for (const pointer of allPointers) {
			if (pointer.device === PointerDevice.Pen) {
				anyDeviceIsStylus = true;
				break;
			}
		}

		// Avoid canceling an existing stroke
		if (this.builder && !this.eventCanCancelStroke(event)) {
			return true;
		}

		if ((allPointers.length === 1 && !isEraser) || anyDeviceIsStylus) {
			this.startPoint = this.toStrokePoint(current);
			this.builder = this.builderFactory(this.startPoint, this.editor.viewport);
			this.currentDeviceType = current.device;
			return true;
		}

		return false;
	}

	private eventCanCancelStroke(event: PointerEvt) {
		// If there has been a delay since the last input event,
		// it's always okay to cancel
		const lastInputTime = this.lastPoint?.time ?? 0;
		if (event.current.timeStamp - lastInputTime > 1000) {
			return true;
		}

		const isPenStroke = this.currentDeviceType === PointerDevice.Pen;
		const isTouchEvent = event.current.device === PointerDevice.Touch;

		// Don't allow pen strokes to be cancelled by touch events.
		if (isPenStroke && isTouchEvent) {
			return false;
		}

		return true;
	}

	public override eventCanBeDeliveredToNonActiveTool(event: PointerEvt) {
		return this.eventCanCancelStroke(event);
	}

	public override onPointerMove({ current }: PointerEvt): void {
		if (!this.builder) return;
		if (current.device !== this.currentDeviceType) return;

		this.addPointToStroke(this.toStrokePoint(current));
	}

	public override onPointerUp({ current }: PointerEvt) {
		if (!this.builder) return false;
		if (current.device !== this.currentDeviceType) {
			// this.builder still exists, so we're handling events from another
			// device type.
			return true;
		}

		// onPointerUp events can have zero pressure. Use the last pressure instead.
		const currentPoint = this.toStrokePoint(current);
		const strokePoint = {
			...currentPoint,
			width: this.lastPoint?.width ?? currentPoint.width,
		};

		this.addPointToStroke(strokePoint);

		if (current.isPrimary) {
			this.finalizeStroke();
		}

		return false;
	}

	public override onGestureCancel() {
		this.builder = null;
		this.editor.clearWetInk();
	}

	private finalizeStroke() {
		if (this.builder) {
			const stroke = this.builder.build();
			this.previewStroke();

			if (stroke.getBBox().area > 0) {
				const canFlatten = true;
				const action = EditorImage.addElement(stroke, canFlatten);
				this.editor.dispatch(action);
			} else {
				console.warn('Pen: Not adding empty stroke', stroke, 'to the canvas.');
			}
		}
		this.builder = null;
		this.lastPoint = null;
		this.editor.clearWetInk();
	}

	private noteUpdated() {
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}

	public setColor(color: Color4): void {
		if (color.toHexString() !== this.style.color.toHexString()) {
			this.style = {
				...this.style,
				color,
			};
			this.noteUpdated();
		}
	}

	public setThickness(thickness: number) {
		if (thickness !== this.style.thickness) {
			this.style = {
				...this.style,
				thickness,
			};
			this.noteUpdated();
		}
	}

	public setStrokeFactory(factory: ComponentBuilderFactory) {
		if (factory !== this.builderFactory) {
			this.builderFactory = factory;
			this.noteUpdated();
		}
	}

	public getThickness() { return this.style.thickness; }
	public getColor() { return this.style.color; }
	public getStrokeFactory() { return this.builderFactory; }

	public override setEnabled(enabled: boolean): void {
		super.setEnabled(enabled);
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		const shortcuts = this.editor.shortcuts;

		// Ctrl+Z: End the stroke so that it can be undone/redone.
		const isCtrlZ = shortcuts.matchesShortcut(undoKeyboardShortcutId, event);
		if (this.builder && isCtrlZ) {
			this.finalizeStroke();

			// Return false: Allow other listeners to handle the event (e.g.
			// undo/redo).
			return false;
		}

		let newThickness: number|undefined;
		if (shortcuts.matchesShortcut(decreaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 2/3;
		} else if (shortcuts.matchesShortcut(increaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 3/2;
		}

		if (newThickness !== undefined) {
			newThickness = Math.min(Math.max(1, newThickness), 256);
			this.setThickness(newThickness);
			return true;
		}

		return false;
	}
}
