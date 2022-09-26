import { assertUnreachable } from '../../language/assertions';
import { Point2, Vec2 } from '../../math/Vec2';
import { cssPrefix } from './SelectionTool';
import Selection from './Selection';
import Pointer from '../../Pointer';

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

	// Bounding box in screen coordinates.

	public constructor(
		readonly shape: HandleShape,
		private readonly parentSide: Vec2,
		private readonly parent: Selection,

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

	public updatePosition() {
		const parentRect = this.parent.screenRegion;
		const size = Vec2.of(handleSize, handleSize);
		const topLeft = parentRect.size.scale(this.parentSide)
			// Center
			.minus(size.times(1/2));

		// Position within the selection box.
		this.element.style.marginLeft = `${topLeft.x}px`;
		this.element.style.marginTop = `${topLeft.y}px`;
		this.element.style.width = `${size.x}px`;
		this.element.style.height = `${size.y}px`;
	}

	/**
     * @returns `true` if the given `EventTarget` matches this.
     */
	public isTarget(target: EventTarget): boolean {
		return target === this.element;
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
}
