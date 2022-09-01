import Color4 from '../Color4';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Pointer, { PointerDevice } from '../Pointer';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import { EditorEventType, PointerEvt, StrokeDataPoint } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';
import { ComponentBuilder, ComponentBuilderFactory } from '../components/builders/types';

interface PenStyle {
    color: Color4;
    thickness: number;
}

export default class Pen extends BaseTool {
	private builder: ComponentBuilder|null = null;
	private builderFactory: ComponentBuilderFactory = makeFreehandLineBuilder;
	private lastPoint: StrokeDataPoint|null = null;

	public readonly kind: ToolType = ToolType.Pen;

	public constructor(
		private editor: Editor,
		description: string,
		private style: PenStyle,
	) {
		super(editor.notifier, description);
	}

	private getPressureMultiplier() {
		return 1 / this.editor.viewport.getScaleFactor() * this.style.thickness;
	}

	private getStrokePoint(pointer: Pointer): StrokeDataPoint {
		const minPressure = 0.3;
		const pressure = Math.max(pointer.pressure ?? 1.0, minPressure);
		return {
			pos: pointer.canvasPos,
			width: pressure * this.getPressureMultiplier(),
			color: this.style.color,
			time: pointer.timeStamp,
		};
	}

	private previewStroke() {
		this.editor.clearWetInk();
		this.builder?.preview(this.editor.display.getWetInkRenderer());
	}

	private addPointToStroke(point: StrokeDataPoint) {
		if (!this.builder) {
			throw new Error('No stroke is currently being generated.');
		}
		this.builder.addPoint(point);
		this.lastPoint = point;
		this.previewStroke();
	}

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (current.device === PointerDevice.Eraser) {
			return false;
		}

		if (allPointers.length === 1 || current.device === PointerDevice.Pen) {
			this.builder = this.builderFactory(this.getStrokePoint(current), this.editor.viewport);
			return true;
		}

		return false;
	}

	public onPointerMove({ current }: PointerEvt): void {
		this.addPointToStroke(this.getStrokePoint(current));
	}

	public onPointerUp({ current }: PointerEvt): void {
		if (!this.builder) {
			return;
		}

		// onPointerUp events can have zero pressure. Use the last pressure instead.
		const currentPoint = this.getStrokePoint(current);
		const strokePoint = {
			...currentPoint,
			width: this.lastPoint?.width ?? currentPoint.width,
		};

		this.addPointToStroke(strokePoint);
		if (this.builder && current.isPrimary) {
			const stroke = this.builder.build();
			this.previewStroke();

			if (stroke.getBBox().area > 0) {
				const canFlatten = true;
				const action = new EditorImage.AddElementCommand(stroke, canFlatten);
				this.editor.dispatch(action);
			} else {
				console.warn('Pen: Not adding empty stroke', stroke, 'to the canvas.');
			}
		}
		this.builder = null;
		this.editor.clearWetInk();
	}

	public onGestureCancel(): void {
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
}
