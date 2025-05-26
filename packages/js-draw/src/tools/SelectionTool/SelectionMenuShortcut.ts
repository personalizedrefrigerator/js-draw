import { Point2, Rect2, Vec2 } from '@js-draw/math';
import { cssPrefix } from './SelectionTool';
import Selection from './Selection';
import Pointer from '../../Pointer';
import Viewport from '../../Viewport';
import { SelectionBoxChild } from './types';
import { ToolLocalization } from '../localization';
import createButton from '../../util/dom/createButton';

const verticalOffset = 40;

// `startPoint` is in screen coordinates
export type DragStartCallback = (startPoint: Point2) => void;
export type DragUpdateCallback = (canvasPoint: Point2) => void;
export type DragEndCallback = () => Promise<void> | void;

type OnShowContextMenu = (anchor: Point2) => void;

export default class SelectionMenuShortcut implements SelectionBoxChild {
	private element: HTMLElement;
	private button: HTMLButtonElement;
	private onClick: () => void;

	public constructor(
		private readonly parent: Selection,
		private readonly viewport: Viewport,
		private readonly icon: Element,
		showContextMenu: OnShowContextMenu,
		private localization: ToolLocalization,
	) {
		this.element = document.createElement('div');
		this.element.classList.add(`${cssPrefix}handle`, `${cssPrefix}selection-menu`);
		this.element.style.setProperty('--vertical-offset', `${verticalOffset}px`);

		this.onClick = () => {
			this.button?.focus({ preventScroll: true });
			const anchor = this.getBBoxCanvasCoords().center;
			showContextMenu(anchor);
		};

		this.initUI();
		this.updatePosition();
	}

	private initUI() {
		const button = createButton({
			classList: ['icon'],
		});
		button.replaceChildren(this.icon);
		button.ariaLabel = this.localization.selectionMenu__show;
		button.title = button.ariaLabel;
		this.button = button;

		// To prevent editor event handlers from conflicting with those for the button,
		// don't register a [click] handler. An onclick handler can be fired incorrectly
		// in this case (in Chrome) after onClick is fired in onDragEnd, leading to a double
		// on-click action.
		button.onkeydown = (event) => {
			if (event.key === 'Enter') {
				// .preventDefault prevents [Enter] from activating the first item in the
				// selection menu.
				event.preventDefault();
				this.onClick();
			}
		};
		this.element.appendChild(button);

		// Update the bounding box of this in response to the new button.
		requestAnimationFrame(() => {
			this.updatePosition();
		});
	}

	public addTo(container: HTMLElement) {
		container.appendChild(this.element);
	}

	public remove() {
		this.element.remove();
	}

	private getElementScreenSize() {
		return Vec2.of(this.element.clientWidth, this.element.clientHeight);
	}

	/** Gets this menu's bounding box relative to the top left of its parent. */
	private getBBoxParentCoords() {
		const topLeft = Vec2.of(0, -verticalOffset);
		const screenSize = this.getElementScreenSize();

		return new Rect2(topLeft.x, topLeft.y, screenSize.x, screenSize.y);
	}

	private getBBoxCanvasCoords() {
		const parentCanvasRect = this.parent.region;

		const toCanvasScale = this.viewport.getSizeOfPixelOnCanvas();
		// Don't apply rotation -- rotation is handled by the selection container
		const contentCanvasSize = this.getElementScreenSize().times(toCanvasScale);

		const handleSizeCanvas = verticalOffset / this.viewport.getScaleFactor();

		const topLeft = Vec2.of(parentCanvasRect.x, parentCanvasRect.y - handleSizeCanvas);
		const minSize = Vec2.of(48, 48).times(toCanvasScale);

		return new Rect2(topLeft.x, topLeft.y, contentCanvasSize.x, contentCanvasSize.y).grownToSize(
			minSize,
		);
	}

	public updatePosition() {
		const bbox = this.getBBoxParentCoords();

		// Position within the selection box.
		this.element.style.marginLeft = `${bbox.topLeft.x}px`;
		this.element.style.marginTop = `${bbox.topLeft.y}px`;
	}

	public containsPoint(canvasPoint: Point2) {
		return this.getBBoxCanvasCoords().containsPoint(canvasPoint);
	}

	private lastDragPointer: Pointer | null = null;
	public handleDragStart(pointer: Pointer) {
		this.lastDragPointer = pointer;
		return true;
	}

	public handleDragUpdate(pointer: Pointer) {
		this.lastDragPointer = pointer;
	}

	public handleDragEnd() {
		if (this.lastDragPointer && this.containsPoint(this.lastDragPointer.canvasPos)) {
			this.onClick();
		}
		this.lastDragPointer = null;
	}
}
