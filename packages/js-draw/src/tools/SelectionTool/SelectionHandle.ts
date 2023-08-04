import { assertUnreachable } from '../../util/assertions';
import { Point2, Rect2, Vec2 } from '@js-draw/math';
import { cssPrefix } from './SelectionTool';
import Selection from './Selection';
import Pointer from '../../Pointer';
import Viewport from '../../Viewport';

export enum HandleShape {
	Circle,
	Square,
}

export const handleSize = 30;

// `startPoint` is in screen coordinates
export type DragStartCallback = (startPoint: Point2)=>void;
export type DragUpdateCallback = (canvasPoint: Point2)=> void;
export type DragEndCallback = ()=> void;

export default class SelectionHandle {
	private element: HTMLElement;
	private snapToGrid: boolean;

	public constructor(
		readonly shape: HandleShape,
		private readonly parentSide: Vec2,
		private readonly parent: Selection,
		private readonly viewport: Viewport,

		private readonly onDragStart: DragStartCallback,
		private readonly onDragUpdate: DragUpdateCallback,
		private readonly onDragEnd: DragEndCallback,
	) {
		this.element = document.createElement('div');
		this.element.classList.add(`${cssPrefix}handle`);

		switch (shape) {
		case HandleShape.Circle:
			this.element.classList.add(`${cssPrefix}circle`);
			break;
		case HandleShape.Square:
			this.element.classList.add(`${cssPrefix}square`);
			break;
		default:
			assertUnreachable(shape);
		}

		this.updatePosition();
	}

	/**
	 * Adds this to `container`, where `conatiner` should be the background/selection
	 * element visible on the screen.
	 */
	public addTo(container: HTMLElement) {
		container.appendChild(this.element);
	}

	/**
	 * Returns this handle's bounding box relative to the top left of the
	 * selection box.
	 */
	private getBBoxParentCoords() {
		const parentRect = this.parent.screenRegion;
		const size = Vec2.of(handleSize, handleSize);
		const topLeft = parentRect.size.scale(this.parentSide)
			// Center
			.minus(size.times(1/2));

		return new Rect2(topLeft.x, topLeft.y, size.x, size.y);
	}

	/** @returns this handle's bounding box relative to the canvas. */
	private getBBoxCanvasCoords() {
		const parentRect = this.parent.region;
		const size = Vec2.of(handleSize, handleSize).times(1/this.viewport.getScaleFactor());

		const topLeftFromParent = parentRect.size.scale(this.parentSide).minus(size.times(0.5));

		return new Rect2(topLeftFromParent.x, topLeftFromParent.y, size.x, size.y).translatedBy(parentRect.topLeft);
	}

	/**
	 * Moves the HTML representation of this to the location matching its internal representation.
	 */
	public updatePosition() {
		const bbox = this.getBBoxParentCoords();

		// Position within the selection box.
		this.element.style.marginLeft = `${bbox.topLeft.x}px`;
		this.element.style.marginTop = `${bbox.topLeft.y}px`;
		this.element.style.width = `${bbox.w}px`;
		this.element.style.height = `${bbox.h}px`;
	}

	/** @returns true iff `point` (in editor **canvas** coordinates) is in this. */
	public containsPoint(point: Point2) {
		const bbox = this.getBBoxCanvasCoords();
		const delta = point.minus(bbox.center);

		// Should have same x and y radius
		const radius = bbox.size.x / 2;

		let result;
		if (this.shape === HandleShape.Circle) {
			result = delta.magnitude() <= radius;
		} else {
			result = Math.abs(delta.x) <= radius && Math.abs(delta.y) <= radius;
		}

		return result;
	}

	private dragLastPos: Vec2|null = null;
	public handleDragStart(pointer: Pointer) {
		this.onDragStart(pointer.canvasPos);
		this.dragLastPos = pointer.canvasPos;
	}

	public handleDragUpdate(pointer: Pointer) {
		if (!this.dragLastPos) {
			return;
		}

		this.onDragUpdate(pointer.canvasPos);
	}

	public handleDragEnd() {
		if (!this.dragLastPos) {
			return;
		}
		this.onDragEnd();
	}

	public setSnapToGrid(snap: boolean) {
		this.snapToGrid = snap;
	}

	public isSnappingToGrid() {
		return this.snapToGrid;
	}
}
