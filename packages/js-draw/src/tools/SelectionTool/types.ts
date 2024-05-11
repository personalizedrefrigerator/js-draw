import type { Rect2, Point2 } from '@js-draw/math';
import Pointer from '../../Pointer';

export enum ResizeMode {
	Both,
	HorizontalOnly,
	VerticalOnly,
}

export enum TransformMode {
	Snap,
	NoSnap,
}

/**
 * Represents a child of the selection that should move with the selection
 * and handle events.
 *
 * Although selection children should be `HTMLElement`s, the selection may be
 * hidden behind an invisible element. As such, these elements should handle
 * drag start/update/end events.
 */
export interface SelectionBoxChild {
	updatePosition(selectionScreenBBox: Rect2): void;
	containsPoint(point: Point2): boolean;
	addTo(container: HTMLElement): void;
	remove(): void;

	// handleDragStart will only be called for points such that containsPoint
	// returns true.
	handleDragStart(pointer: Pointer): boolean;
	handleDragUpdate(pointer: Pointer): void;
	handleDragEnd(): void;
}
