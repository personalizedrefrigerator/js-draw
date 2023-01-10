import { EditorEventType, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import Editor from '../Editor';
import { Point2, Vec2 } from '../math/Vec2';
import LineSegment2 from '../math/LineSegment2';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import { PointerDevice } from '../Pointer';
import Color4 from '../Color4';
import Rect2 from '../math/Rect2';
import RenderingStyle from '../rendering/RenderingStyle';

export default class Eraser extends BaseTool {
	private lastPoint: Point2;
	private toRemove: AbstractComponent[];
	private thickness: number = 10;

	// Commands that each remove one element
	private partialCommands: Erase[] = [];

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);
	}

	private clearPreview() {
		this.editor.clearWetInk();
	}

	private getSizeOnCanvas() {
		return this.thickness / this.editor.viewport.getScaleFactor();
	}

	private drawPreviewAt(point: Point2) {
		this.clearPreview();

		const size = this.getSizeOnCanvas();

		const renderer = this.editor.display.getWetInkRenderer();
		const rect = this.getEraserRect(point);
		const fill: RenderingStyle = {
			fill: Color4.gray,
		};
		renderer.drawRect(rect, size / 4, fill);
	}

	private getEraserRect(centerPoint: Point2) {
		const size = this.getSizeOnCanvas();
		const halfSize = Vec2.of(size / 2, size / 2);
		return Rect2.fromCorners(centerPoint.minus(halfSize), centerPoint.plus(halfSize));
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 || event.current.device === PointerDevice.Eraser) {
			this.lastPoint = event.current.canvasPos;
			this.toRemove = [];

			this.drawPreviewAt(event.current.canvasPos);
			return true;
		}

		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		const currentPoint = event.current.canvasPos;
		if (currentPoint.minus(this.lastPoint).magnitude() === 0) {
			return;
		}

		// Currently only objects within eraserRect or that intersect a straight line
		// from the center of the current rect to the previous are erased. TODO: Erase
		// all objects as if there were pointerMove events between the two points.
		const eraserRect = this.getEraserRect(currentPoint);
		const line = new LineSegment2(this.lastPoint, currentPoint);
		const region = Rect2.union(line.bbox, eraserRect);

		const intersectingElems = this.editor.image.getElementsIntersectingRegion(region).filter(component => {
			return component.intersects(line) || component.intersectsRect(eraserRect);
		});

		// Remove any intersecting elements.
		this.toRemove.push(...intersectingElems);

		// Create new Erase commands for the now-to-be-erased elements and apply them.
		const newPartialCommands = intersectingElems.map(elem => new Erase([ elem ]));
		newPartialCommands.forEach(cmd => cmd.apply(this.editor));

		this.partialCommands.push(...newPartialCommands);

		this.drawPreviewAt(currentPoint);
		this.lastPoint = currentPoint;
	}

	public onPointerUp(_event: PointerEvt): void {
		if (this.toRemove.length > 0) {
			// Undo commands for each individual component and unite into a single command.
			this.partialCommands.forEach(cmd => cmd.unapply(this.editor));
			this.partialCommands = [];

			const command = new Erase(this.toRemove);
			this.editor.dispatch(command); // dispatch: Makes undo-able.
		}

		this.clearPreview();
	}

	public onGestureCancel(): void {
		this.partialCommands.forEach(cmd => cmd.unapply(this.editor));
		this.partialCommands = [];
		this.clearPreview();
	}

	public getThickness() {
		return this.thickness;
	}

	public setThickness(thickness: number) {
		this.thickness = thickness;

		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}
}
