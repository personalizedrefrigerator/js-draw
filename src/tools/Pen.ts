import Color4 from '../Color4';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Pointer, { PointerDevice } from '../Pointer';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import { EditorEventType, KeyPressEvent, KeyUpEvent, PointerEvt, StrokeDataPoint } from '../types';
import BaseTool from './BaseTool';
import { ComponentBuilder, ComponentBuilderFactory } from '../components/builders/types';

export interface PenStyle {
    color: Color4;
    thickness: number;
}

export default class Pen extends BaseTool {
	protected builder: ComponentBuilder|null = null;
	private lastPoint: StrokeDataPoint|null = null;
	private ctrlKeyPressed: boolean = false;

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
		if (this.isSnappingToGrid()) {
			pointer = pointer.snappedToGrid(this.editor.viewport);
		}

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

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		const isEraser = current.device === PointerDevice.Eraser;

		let anyDeviceIsStylus = false;
		for (const pointer of allPointers) {
			if (pointer.device === PointerDevice.Pen) {
				anyDeviceIsStylus = true;
				break;
			}
		}

		if ((allPointers.length === 1 && !isEraser) || anyDeviceIsStylus) {
			this.builder = this.builderFactory(this.toStrokePoint(current), this.editor.viewport);
			return true;
		}

		return false;
	}

	public onPointerMove({ current }: PointerEvt): void {
		if (!this.builder) return;

		this.addPointToStroke(this.toStrokePoint(current));
	}

	public onPointerUp({ current }: PointerEvt): void {
		if (!this.builder) {
			return;
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
	}

	public onGestureCancel() {
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

	public setEnabled(enabled: boolean): void {
		super.setEnabled(enabled);

		this.ctrlKeyPressed = false;
	}

	private isSnappingToGrid() { return this.ctrlKeyPressed; }

	public onKeyPress({ key, ctrlKey }: KeyPressEvent): boolean {
		key = key.toLowerCase();

		let newThickness: number|undefined;
		if (key === '-' || key === '_') {
			newThickness = this.getThickness() * 2/3;
		} else if (key === '+' || key === '=') {
			newThickness = this.getThickness() * 3/2;
		}

		if (newThickness !== undefined) {
			newThickness = Math.min(Math.max(1, newThickness), 256);
			this.setThickness(newThickness);
			return true;
		}

		if (key === 'control' || key === 'meta') {
			this.ctrlKeyPressed = true;
			return true;
		}

		// Ctrl+Z: End the stroke so that it can be undone/redone.
		if (key === 'z' && ctrlKey && this.builder) {
			this.finalizeStroke();
		}

		return false;
	}

	public onKeyUp({ key }: KeyUpEvent): boolean {
		key = key.toLowerCase();

		if (key === 'control' || key === 'meta') {
			this.ctrlKeyPressed = false;
			return true;
		}

		return false;
	}
}
