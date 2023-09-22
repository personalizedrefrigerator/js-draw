import { EditorEventType } from '../types';
import { KeyPressEvent, PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';
import Editor from '../Editor';
import { Point2, Vec2, LineSegment2, Color4, Rect2 } from '@js-draw/math';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import { PointerDevice } from '../Pointer';
import RenderingStyle from '../rendering/RenderingStyle';
import { decreaseSizeKeyboardShortcutId, increaseSizeKeyboardShortcutId } from './keybindings';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';

export default class Eraser extends BaseTool {
	private lastPoint: Point2|null = null;
	private isFirstEraseEvt: boolean = true;
	private toRemove: AbstractComponent[];
	private thickness: number = 10;
	private thicknessValue: MutableReactiveValue<number>;

	// Commands that each remove one element
	private partialCommands: Erase[] = [];

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);

		this.thicknessValue = ReactiveValue.fromInitialValue(this.thickness);
		this.thicknessValue.onUpdate(value => {
			this.thickness = value;

			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		});
	}

	public override mustBeDisabledInReadOnlyEditor() {
		return true;
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

	private eraseTo(currentPoint: Point2) {
		if (!this.isFirstEraseEvt && currentPoint.minus(this.lastPoint!).magnitude() === 0) {
			return;
		}
		this.isFirstEraseEvt = false;

		// Currently only objects within eraserRect or that intersect a straight line
		// from the center of the current rect to the previous are erased. TODO: Erase
		// all objects as if there were pointerMove events between the two points.
		const eraserRect = this.getEraserRect(currentPoint);
		const line = new LineSegment2(this.lastPoint!, currentPoint);
		const region = Rect2.union(line.bbox, eraserRect);

		const intersectingElems = this.editor.image.getElementsIntersectingRegion(region).filter(component => {
			return component.intersects(line) || component.intersectsRect(eraserRect);
		});

		// Only erase components that could be selected (and thus interacted with)
		// by the user.
		const toErase = intersectingElems.filter(elem => elem.isSelectable());

		// Remove any intersecting elements.
		this.toRemove.push(...toErase);

		// Create new Erase commands for the now-to-be-erased elements and apply them.
		const newPartialCommands = toErase.map(elem => new Erase([ elem ]));
		newPartialCommands.forEach(cmd => cmd.apply(this.editor));

		this.partialCommands.push(...newPartialCommands);

		this.drawPreviewAt(currentPoint);
		this.lastPoint = currentPoint;
	}

	public override onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 || event.current.device === PointerDevice.Eraser) {
			this.lastPoint = event.current.canvasPos;
			this.toRemove = [];
			this.isFirstEraseEvt = true;

			this.drawPreviewAt(event.current.canvasPos);
			return true;
		}

		return false;
	}

	public override onPointerMove(event: PointerEvt): void {
		const currentPoint = event.current.canvasPos;

		this.eraseTo(currentPoint);
	}

	public override onPointerUp(event: PointerEvt): void {
		this.eraseTo(event.current.canvasPos);

		if (this.toRemove.length > 0) {
			// Undo commands for each individual component and unite into a single command.
			this.partialCommands.forEach(cmd => cmd.unapply(this.editor));
			this.partialCommands = [];

			const command = new Erase(this.toRemove);
			this.editor.dispatch(command); // dispatch: Makes undo-able.
		}

		this.clearPreview();
	}

	public override onGestureCancel(): void {
		this.partialCommands.forEach(cmd => cmd.unapply(this.editor));
		this.partialCommands = [];
		this.clearPreview();
	}


	public override onKeyPress(event: KeyPressEvent): boolean {
		const shortcuts = this.editor.shortcuts;

		let newThickness: number|undefined;
		if (shortcuts.matchesShortcut(decreaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 2/3;
		} else if (shortcuts.matchesShortcut(increaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 3/2;
		}

		if (newThickness !== undefined) {
			newThickness = Math.min(Math.max(1, newThickness), 200);
			this.setThickness(newThickness);
			return true;
		}

		return false;
	}

	public getThickness() {
		return this.thickness;
	}

	/**
	 * Returns a {@link MutableReactiveValue} that can be used to watch
	 * this tool's thickness.
	 */
	public getThicknessValue() {
		return this.thicknessValue;
	}

	public setThickness(thickness: number) {
		this.thicknessValue.set(thickness);
	}
}
