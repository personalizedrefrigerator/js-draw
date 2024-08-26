
import { Point2, Rect2, Vec2 } from '@js-draw/math';
import { cssPrefix } from './SelectionTool';
import Selection from './Selection';
import Pointer from '../../Pointer';
import Viewport from '../../Viewport';
import { SelectionBoxChild } from './types';


const verticalOffset = 40;

// `startPoint` is in screen coordinates
export type DragStartCallback = (startPoint: Point2)=>void;
export type DragUpdateCallback = (canvasPoint: Point2)=> void;
export type DragEndCallback = ()=> Promise<void>|void;

type OnShowContextMenu = (anchor: Point2)=>void;

export default class SelectionTopMenu implements SelectionBoxChild {
	private element: HTMLElement;

	public constructor(
		private readonly parent: Selection,
		private readonly viewport: Viewport,
		showContextMenu: OnShowContextMenu,
	) {
		this.element = document.createElement('div');
		this.element.classList.add(
			`${cssPrefix}handle`,
			`${cssPrefix}selection-menu`,
		);
		this.element.style.setProperty('--vertical-offset', `${verticalOffset}px`);

		this.addButton('...', async () => {
			const anchor = this.getBBoxCanvasCoords().center;
			showContextMenu(anchor);
		});

		this.updatePosition();
	}

	public addTo(container: HTMLElement) {
		container.appendChild(this.element);
	}

	public remove() { this.element.remove(); }

	public addButton(label: string, onClick: ()=>void) {
		const button = document.createElement('button');
		button.textContent = label;
		button.onclick = (_event) => {
			onClick();
		};
		this.element.appendChild(button);

		// Update the bounding box of this in response to the new button.
		// TODO: Use a ResizeObserver when available.
		requestAnimationFrame(() => {
			this.updatePosition();
		});
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
		return new Rect2(
			topLeft.x,
			topLeft.y,
			contentCanvasSize.x,
			contentCanvasSize.y,
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

	public handleDragStart(_pointer: Pointer) {
		return true;
	}

	public handleDragUpdate(_pointer: Pointer) {
		// No-op
	}

	public handleDragEnd() {
	}
}
