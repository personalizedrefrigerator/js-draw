import { Point2, Vec2 } from '@js-draw/math';
import Viewport from './Viewport';

export enum PointerDevice {
	Pen,
	Eraser,
	Touch,
	PrimaryButtonMouse,
	RightButtonMouse,
	Other,
}

// Provides a snapshot containing information about a pointer. A Pointer
// object is immutable — it will not be updated when the pointer's information changes.
export default class Pointer {
	private constructor(
		// The (x, y) position of the pointer relative to the top-left corner
		// of the visible canvas.
		public readonly screenPos: Point2,

		// Position of the pointer relative to the top left corner of the drawing
		// surface.
		public readonly canvasPos: Point2,

		public readonly pressure: number|null,
		public readonly isPrimary: boolean,
		public readonly down: boolean,

		public readonly device: PointerDevice,

		// Unique ID for the pointer
		public readonly id: number,

		// Numeric timestamp (milliseconds, as from `performance.now()`).
		public readonly timeStamp: number,
	) {
	}

	/**
	 * Snaps this pointer to the nearest grid point (rounds the coordinates of this
	 * pointer based on the current zoom). Returns a new Pointer and does not modify
	 * this.
	 */
	public snappedToGrid(viewport: Viewport): Pointer {
		const snappedCanvasPos = viewport.snapToGrid(this.canvasPos);
		return this.withCanvasPosition(snappedCanvasPos, viewport);
	}

	// Snap this pointer to the X or Y axis (whichever is closer), where (0,0)
	// is considered to be at `originPointScreen`.
	// @internal
	public lockedToXYAxesScreen(originPointScreen: Vec2, viewport: Viewport) {
		const current = this.screenPos;
		const currentFromStart = current.minus(originPointScreen);

		// Determine whether the last point was closer to being on the
		// x- or y- axis.
		const projOntoXAxis = Vec2.unitX.times(currentFromStart.x);
		const projOntoYAxis = Vec2.unitY.times(currentFromStart.y);

		let pos;
		if (currentFromStart.dot(projOntoXAxis) > currentFromStart.dot(projOntoYAxis)) {
			pos = projOntoXAxis;
		} else {
			pos = projOntoYAxis;
		}

		pos = pos.plus(originPointScreen);

		return this.withScreenPosition(pos, viewport);
	}

	/** @see {@link withCanvasPosition} */
	public withScreenPosition(screenPos: Point2, viewport: Viewport) {
		const canvasPos = viewport.screenToCanvas(screenPos);
		return this.withCanvasPosition(canvasPos, viewport);
	}

	/** Returns a copy of this pointer with a changed timestamp. */
	public withTimestamp(timeStamp: number) {
		return new Pointer(
			this.screenPos,
			this.canvasPos,
			this.pressure,
			this.isPrimary,
			this.down,
			this.device,
			this.id,
			timeStamp
		);
	}

	/**
	 * Returns a copy of this pointer with a new position. The screen position is determined
	 * by the given `canvasPos`.
	 */
	public withCanvasPosition(canvasPos: Point2, viewport: Viewport) {
		const screenPos = viewport.canvasToScreen(canvasPos);

		return new Pointer(
			screenPos,
			canvasPos,
			this.pressure,
			this.isPrimary,
			this.down,
			this.device,
			this.id,
			this.timeStamp,
		);
	}

	// Creates a Pointer from a DOM event. If `relativeTo` is given, (0, 0) in screen coordinates is
	// considered the top left of `relativeTo`.
	public static ofEvent(evt: PointerEvent, isDown: boolean, viewport: Viewport, relativeTo?: HTMLElement): Pointer {
		let screenPos = Vec2.of(evt.clientX, evt.clientY);
		if (relativeTo) {
			const bbox = relativeTo.getBoundingClientRect();
			screenPos = screenPos.minus(Vec2.of(bbox.left, bbox.top));
		}

		const pointerTypeToDevice: Record<string, PointerDevice> = {
			'mouse': PointerDevice.PrimaryButtonMouse,
			'pen': PointerDevice.Pen,
			'touch': PointerDevice.Touch,
		};

		let device = pointerTypeToDevice[evt.pointerType] ?? PointerDevice.Other;
		const eraserButtonMask = 0x20;
		if (device === PointerDevice.Pen && (evt.buttons & eraserButtonMask) !== 0) {
			device = PointerDevice.Eraser;
		}

		const timeStamp = evt.timeStamp;
		const canvasPos = viewport.roundPoint(viewport.screenToCanvas(screenPos));

		if (device === PointerDevice.PrimaryButtonMouse) {
			if (evt.buttons & 0x2) {
				device = PointerDevice.RightButtonMouse;
			}
			// Commented out: Mouse up events seem to not satisfy this condition on mouse up.
			// else if (!(evt.buttons & 0x1)) {
			//	device = PointerDevice.Other;
			//}
		}

		return new Pointer(
			screenPos,
			canvasPos,
			evt.pressure ?? null,
			evt.isPrimary,
			isDown,
			device,
			evt.pointerId,
			timeStamp,
		);
	}

	// Create a new Pointer from a point on the canvas.
	// Intended for unit tests.
	public static ofCanvasPoint(
		canvasPos: Point2,
		isDown: boolean,
		viewport: Viewport,
		id: number = 0,
		device: PointerDevice = PointerDevice.Pen,
		isPrimary: boolean = true,
		pressure: number|null = null
	): Pointer {
		const screenPos = viewport.canvasToScreen(canvasPos);
		const timeStamp = (new Date()).getTime();

		return new Pointer(
			screenPos,
			canvasPos,
			pressure,
			isPrimary,
			isDown,
			device,
			id,
			timeStamp
		);
	}
}
