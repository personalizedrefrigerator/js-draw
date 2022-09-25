import { assertUnreachable } from "../../language/assertions";
import { Point2, Vec2 } from "../../math/Vec2";
import { cssPrefix } from "./SelectionTool";
import Selection from './Selection';
import { Rect2 } from "../../lib";
import Pointer from '../../Pointer';

export enum HandleShape {
	Circle,
	Square,
};

const handleSize = 30;

// `startPoint` is in screen coordinates
export type DragStartCallback = (startPoint: Point2)=>void;
export type DragUpdateCallback = (currentPoint: Point2, screenDelta: Vec2)=> void;
export type DragEndCallback = ()=> void;

export default class SelectionHandle {
	private element: HTMLElement;

	// Bounding box in screen coordinates.
	private bbox: Rect2;

	public constructor(
		private readonly shape: HandleShape,
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

	public addTo(container: HTMLElement) {
		container.appendChild(this.element);
	}

	public updatePosition() {
		const parentRect = this.parent.region;
		const size = Vec2.of(handleSize, handleSize);
		const topLeft = parentRect
			.topLeft.plus(parentRect.size.scale(this.parentSide))
			// Center
			.minus(size.times(1/2));
		this.bbox = Rect2.fromCorners(topLeft, topLeft.plus(size));

		this.element.style.left = `${topLeft.x}px`;
		this.element.style.top = `${topLeft.y}px`;
		this.element.style.width = `${this.bbox.width}px`;
		this.element.style.height = `${this.bbox.height}px`;
	}

	public contains(screenPoint: Point2): boolean {
		if (this.shape === HandleShape.Circle) {
			const handleRadius = handleSize / 2;
			return this.bbox.center.minus(screenPoint).magnitudeSquared() <= handleRadius ** 2;
		}
		else if (this.shape === HandleShape.Square) {
			return this.bbox.containsPoint(screenPoint);
		}

		return assertUnreachable(this.shape);
	}

	private dragLastPos: Vec2|null = null;
	public handleDragStart(pointer: Pointer) {
		if (!this.contains(pointer.screenPos)) {
			return false;
		}

		this.onDragStart(pointer.screenPos);
		this.dragLastPos = pointer.screenPos;
		return true;
	}

	public handleDragUpdate(pointer: Pointer) {
		if (!this.dragLastPos) {
			return;
		}

		const delta = pointer.screenPos.minus(this.dragLastPos);
		this.onDragUpdate(pointer.screenPos, delta);
		this.dragLastPos = pointer.screenPos;
	}

	public handleDragEnd(pointer: Pointer) {
		if (!this.dragLastPos) {
			return;
		}
		this.handleDragUpdate(pointer);
		this.onDragEnd();
	}
}