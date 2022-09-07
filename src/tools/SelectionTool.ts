import Command from '../commands/Command';
import Duplicate from '../commands/Duplicate';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import Editor from '../Editor';
import Mat33 from '../geometry/Mat33';
// import Mat33 from "../geometry/Mat33";
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import { EditorLocalization } from '../localization';
import { EditorEventType, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

const handleScreenSize = 30;
const styles = `
	.handleOverlay {
	}

	.handleOverlay > .selectionBox {
		position: absolute;
		z-index: 0;
		transform-origin: center;
	}

	.handleOverlay > .selectionBox .draggableBackground {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;

		background-color: var(--secondary-background-color);
		opacity: 0.8;
		border: 1px solid var(--primary-background-color);
	}

	.handleOverlay .resizeCorner {
		width: ${handleScreenSize}px;
		height: ${handleScreenSize}px;
		margin-right: -${handleScreenSize / 2}px;
		margin-bottom: -${handleScreenSize / 2}px;

		position: absolute;
		bottom: 0;
		right: 0;

		opacity: 0.8;
		background-color: var(--primary-background-color);
		border: 1px solid var(--primary-foreground-color);
	}

	.handleOverlay > .selectionBox .rotateCircleContainer {
		position: absolute;
		top: 50%;
		bottom: 50%;
		left: 50%;
		right: 50%;
	}

	.handleOverlay .rotateCircle {
		width: ${handleScreenSize}px;
		height: ${handleScreenSize}px;
		margin-left: -${handleScreenSize / 2}px;
		margin-top: -${handleScreenSize / 2}px;
		opacity: 0.8;

		border: 1px solid var(--primary-foreground-color);
		background-color: var(--primary-background-color);
		border-radius: 100%;
	}
`;

type DragCallback = (delta: Vec2, offset: Point2)=> void;
type DragEndCallback = ()=> void;

const makeDraggable = (element: HTMLElement, onDrag: DragCallback, onDragEnd: DragEndCallback) => {
	element.style.touchAction = 'none';
	let down = false;

	// Work around a Safari bug
	element.addEventListener('touchstart', evt => evt.preventDefault());

	let lastX: number;
	let lastY: number;
	element.addEventListener('pointerdown', event => {
		if (event.isPrimary) {
			down = true;
			element.setPointerCapture(event.pointerId);
			lastX = event.pageX;
			lastY = event.pageY;

			return true;
		}
		return false;
	});
	element.addEventListener('pointermove', event => {
		if (event.isPrimary && down) {
			// Safari/iOS doesn't seem to support movementX/movementY on pointer events.
			// Calculate manually:
			const delta = Vec2.of(event.pageX - lastX, event.pageY - lastY);
			onDrag(delta, Vec2.of(event.offsetX, event.offsetY));
			lastX = event.pageX;
			lastY = event.pageY;

			return true;
		}
		return false;
	});
	const onPointerEnd = (event: PointerEvent) => {
		if (event.isPrimary) {
			down = false;
			onDragEnd();

			return true;
		}
		return false;
	};
	element.addEventListener('pointerup', onPointerEnd);
	element.addEventListener('pointercancel', onPointerEnd);
};

// Maximum number of strokes to transform without a re-render.
const updateChunkSize = 100;

class Selection {
	public region: Rect2;
	private boxRotation: number;
	private backgroundBox: HTMLElement;
	private rotateCircle: HTMLElement;
	private selectedElems: AbstractComponent[];
	private transform: Mat33;
	private transformationCommands: Command[];

	public constructor(
		public startPoint: Point2, private editor: Editor
	) {
		this.boxRotation = this.editor.viewport.getRotationAngle();
		this.selectedElems = [];
		this.region = Rect2.bboxOf([startPoint]);

		// Create draggable rectangles
		this.backgroundBox = document.createElement('div');
		const draggableBackground = document.createElement('div');
		const resizeCorner = document.createElement('div');
		this.rotateCircle = document.createElement('div');
		const rotateCircleContainer = document.createElement('div');

		this.backgroundBox.classList.add('selectionBox');
		draggableBackground.classList.add('draggableBackground');
		resizeCorner.classList.add('resizeCorner');
		this.rotateCircle.classList.add('rotateCircle');
		rotateCircleContainer.classList.add('rotateCircleContainer');

		rotateCircleContainer.appendChild(this.rotateCircle);

		this.backgroundBox.appendChild(draggableBackground);
		this.backgroundBox.appendChild(rotateCircleContainer);
		this.backgroundBox.appendChild(resizeCorner);

		this.transformationCommands = [];
		this.transform = Mat33.identity;

		makeDraggable(draggableBackground, (deltaPosition: Vec2) => {
			this.handleBackgroundDrag(deltaPosition);
		}, () => this.finishDragging());

		makeDraggable(resizeCorner, (deltaPosition) => {
			this.handleResizeCornerDrag(deltaPosition);
		}, () => this.finishDragging());

		makeDraggable(this.rotateCircle, (_deltaPosition, offset) => {
			this.handleRotateCircleDrag(offset);
		}, () => this.finishDragging());
	}

	// Note a small change in the position of this' background while dragging
	// At the end of a drag, changes should be applied by calling this.finishDragging()
	public handleBackgroundDrag(deltaPosition: Vec2) {
		// Re-scale the change in position
		// (use a Vec3 transform to avoid translating deltaPosition)
		deltaPosition = this.editor.viewport.screenToCanvasTransform.transformVec3(
			deltaPosition
		);

		// Snap position to a multiple of 10 (additional decimal points lead to larger files).
		deltaPosition = this.editor.viewport.roundPoint(deltaPosition);

		this.region = this.region.translatedBy(deltaPosition);
		this.transform = this.transform.rightMul(Mat33.translation(deltaPosition));

		this.previewTransformCmds();
	}

	public handleResizeCornerDrag(deltaPosition: Vec2) {
		deltaPosition = this.editor.viewport.screenToCanvasTransform.transformVec3(
			deltaPosition
		);
		deltaPosition = this.editor.viewport.roundPoint(deltaPosition);

		const oldWidth = this.region.w;
		const oldHeight = this.region.h;
		const newSize = this.region.size.plus(deltaPosition);

		if (newSize.y > 0 && newSize.x > 0) {
			this.region = this.region.resizedTo(newSize);
			const scaleFactor = Vec2.of(this.region.w / oldWidth, this.region.h / oldHeight);

			const currentTransfm = Mat33.scaling2D(scaleFactor, this.region.topLeft);
			this.transform = this.transform.rightMul(currentTransfm);
			this.previewTransformCmds();
		}
	}

	public handleRotateCircleDrag(offset: Vec2) {
		this.boxRotation = this.boxRotation % (2 * Math.PI);
		if (this.boxRotation < 0) {
			this.boxRotation += 2 * Math.PI;
		}

		let targetRotation = offset.angle();
		targetRotation = targetRotation % (2 * Math.PI);
		if (targetRotation < 0) {
			targetRotation += 2 * Math.PI;
		}

		let deltaRotation = (targetRotation - this.boxRotation);

		const rotationStep = Math.PI / 12;
		if (Math.abs(deltaRotation) < rotationStep || !isFinite(deltaRotation)) {
			return;
		} else {
			const rotationDirection = Math.sign(deltaRotation);

			// Step exactly one rotationStep
			deltaRotation = Math.floor(Math.abs(deltaRotation) / rotationStep) * rotationStep;
			deltaRotation *= rotationDirection;
		}

		this.transform = this.transform.rightMul(Mat33.zRotation(deltaRotation, this.region.center));
		this.boxRotation += deltaRotation;
		this.previewTransformCmds();
	}

	private computeTransformCommands() {
		return this.selectedElems.map(elem => {
			return elem.transformBy(this.transform);
		});
	}

	// Applies the current transformation to the selection
	public finishDragging() {
		this.transformationCommands.forEach(cmd => {
			cmd.unapply(this.editor);
		});

		const fullTransform = this.transform;
		const inverseTransform = this.transform.inverse();
		const deltaBoxRotation = this.boxRotation;
		const currentTransfmCommands = this.computeTransformCommands();

		// Reset for the next drag
		this.transformationCommands = [];
		this.transform = Mat33.identity;
		this.region = this.region.transformedBoundingBox(inverseTransform);

		// Make the commands undo-able
		this.editor.dispatch(new Selection.ApplyTransformationCommand(
			this, currentTransfmCommands, fullTransform, inverseTransform, deltaBoxRotation
		));
	}

	private static ApplyTransformationCommand = class extends Command {
		public constructor(
			private selection: Selection,
			private currentTransfmCommands: Command[],
			private fullTransform: Mat33, private inverseTransform: Mat33,
			private deltaBoxRotation: number,
		) {
			super();
		}

		public async apply(editor: Editor) {
			// Approximate the new selection
			this.selection.region = this.selection.region.transformedBoundingBox(this.fullTransform);
			this.selection.boxRotation += this.deltaBoxRotation;
			this.selection.updateUI();

			await editor.asyncApplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection.recomputeRegion();
			this.selection.updateUI();
		}

		public async unapply(editor: Editor) {
			this.selection.region = this.selection.region.transformedBoundingBox(this.inverseTransform);
			this.selection.boxRotation -= this.deltaBoxRotation;
			this.selection.updateUI();

			await editor.asyncUnapplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection.recomputeRegion();
			this.selection.updateUI();
		}

		public description(localizationTable: EditorLocalization) {
			return localizationTable.transformedElements(this.currentTransfmCommands.length);
		}
	};

	// Preview the effects of the current transformation on the selection
	private previewTransformCmds() {
		// Don't render what we're moving if it's likely to be slow.
		if (this.selectedElems.length > updateChunkSize) {
			this.updateUI();
			return;
		}

		this.transformationCommands.forEach(cmd => cmd.unapply(this.editor));
		this.transformationCommands = this.computeTransformCommands();
		this.transformationCommands.forEach(cmd => cmd.apply(this.editor));

		this.updateUI();
	}


	public appendBackgroundBoxTo(elem: HTMLElement) {
		if (this.backgroundBox.parentElement) {
			this.backgroundBox.remove();
		}

		elem.appendChild(this.backgroundBox);
	}

	public setToPoint(point: Point2) {
		this.region = this.region.grownToPoint(point);
		this.recomputeBoxRotation();
		this.updateUI();
	}

	public cancelSelection() {
		if (this.backgroundBox.parentElement) {
			this.backgroundBox.remove();
		}
		this.region = Rect2.empty;
	}

	// Find the objects corresponding to this in the document,
	// select them.
	// Returns false iff nothing was selected.
	public resolveToObjects(): boolean {
		// Grow the rectangle, if necessary
		if (this.region.w === 0 || this.region.h === 0) {
			const padding = this.editor.viewport.visibleRect.maxDimension / 100;
			this.region = Rect2.bboxOf(this.region.corners, padding);
		}

		this.selectedElems = this.editor.image.getElementsIntersectingRegion(this.region).filter(elem => {
			if (this.region.containsRect(elem.getBBox())) {
				return true;
			}

			// Calculated bounding boxes can be slightly larger than their actual contents' bounding box.
			// As such, test with more lines than just this' edges.
			const testLines = [];
			for (const subregion of this.region.divideIntoGrid(2, 2)) {
				testLines.push(...subregion.getEdges());
			}

			return testLines.some(edge => elem.intersects(edge));
		});

		// Find the bounding box of all selected elements.
		if (!this.recomputeRegion()) {
			return false;
		}
		this.updateUI();

		return true;
	}

	// Recompute this' region from the selected elements. Resets rotation to zero.
	// Returns false if the selection is empty.
	public recomputeRegion(): boolean {
		const newRegion = this.selectedElems.reduce((
			accumulator: Rect2|null, elem: AbstractComponent
		): Rect2 => {
			return (accumulator ?? elem.getBBox()).union(elem.getBBox());
		}, null);

		if (!newRegion) {
			this.cancelSelection();
			return false;
		}

		this.region = newRegion;


		const minSize = this.getMinCanvasSize();
		if (this.region.w < minSize || this.region.h < minSize) {
			// Add padding
			const padding = minSize / 2;
			this.region = Rect2.bboxOf(
				this.region.corners, padding
			);
		}

		this.recomputeBoxRotation();
		return true;
	}

	public getMinCanvasSize(): number {
		const canvasHandleSize = handleScreenSize / this.editor.viewport.getScaleFactor();
		return canvasHandleSize * 2;
	}

	private recomputeBoxRotation() {
		this.boxRotation = this.editor.viewport.getRotationAngle();
	}

	public getSelectedItemCount() {
		return this.selectedElems.length;
	}

	public updateUI() {
		if (!this.backgroundBox) {
			return;
		}

		const rightSideDirection = this.region.topRight.minus(this.region.bottomRight);
		const topSideDirection = this.region.topLeft.minus(this.region.topRight);

		const toScreen = this.editor.viewport.canvasToScreenTransform;
		const centerOnScreen = toScreen.transformVec2(this.region.center);
		const heightOnScreen = toScreen.transformVec3(rightSideDirection).magnitude();
		const widthOnScreen = toScreen.transformVec3(topSideDirection).magnitude();

		this.backgroundBox.style.marginLeft = `${centerOnScreen.x - widthOnScreen / 2}px`;
		this.backgroundBox.style.marginTop = `${centerOnScreen.y - heightOnScreen / 2}px`;
		this.backgroundBox.style.width = `${widthOnScreen}px`;
		this.backgroundBox.style.height = `${heightOnScreen}px`;

		const rotationDeg = this.boxRotation * 180 / Math.PI;

		this.backgroundBox.style.transform = `rotate(${rotationDeg}deg)`;
		this.rotateCircle.style.transform = `rotate(${-rotationDeg}deg)`;
	}

	public deleteSelectedObjects(): Command {
		return new Erase(this.selectedElems);
	}

	public duplicateSelectedObjects(): Command {
		return new Duplicate(this.selectedElems);
	}
}

export default class SelectionTool extends BaseTool {
	private handleOverlay: HTMLElement;
	private prevSelectionBox: Selection|null;
	private selectionBox: Selection|null;
	public readonly kind: ToolType = ToolType.Selection;

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);

		this.handleOverlay = document.createElement('div');
		editor.createHTMLOverlay(this.handleOverlay);
		editor.addStyleSheet(styles);

		this.handleOverlay.style.display = 'none';
		this.handleOverlay.classList.add('handleOverlay');

		editor.notifier.on(EditorEventType.ViewportChanged, _data => {
			this.selectionBox?.recomputeRegion();
			this.selectionBox?.updateUI();
		});
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 && event.current.isPrimary) {
			this.prevSelectionBox = this.selectionBox;
			this.selectionBox = new Selection(
				event.current.canvasPos, this.editor
			);
			// Remove any previous selection rects
			this.handleOverlay.replaceChildren();
			this.selectionBox.appendBackgroundBoxTo(this.handleOverlay);

			return true;
		}
		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		if (!this.selectionBox) return;

		this.selectionBox!.setToPoint(event.current.canvasPos);
	}

	private onGestureEnd() {
		if (!this.selectionBox) return;

		// Expand/shrink the selection rectangle, if applicable
		const hasSelection = this.selectionBox.resolveToObjects();

		// Note that the selection has changed
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});

		if (hasSelection) {
			this.editor.announceForAccessibility(
				this.editor.localization.selectedElements(this.selectionBox.getSelectedItemCount())
			);

			const selectionRect = this.selectionBox.region;
			this.editor.dispatchNoAnnounce(this.editor.viewport.zoomTo(selectionRect, false), false);
		}
	}

	public onPointerUp(event: PointerEvt): void {
		if (!this.selectionBox) return;

		this.selectionBox.setToPoint(event.current.canvasPos);
		this.onGestureEnd();
	}

	public onGestureCancel(): void {
		// Revert to the previous selection, if any.
		this.selectionBox?.cancelSelection();
		this.selectionBox = this.prevSelectionBox;
		this.selectionBox?.appendBackgroundBoxTo(this.handleOverlay);
	}

	public setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		// Clear the selection
		this.handleOverlay.replaceChildren();
		this.selectionBox = null;

		this.handleOverlay.style.display = enabled ? 'block' : 'none';
	}

	// Get the object responsible for displaying this' selection.
	public getSelection(): Selection|null {
		return this.selectionBox;
	}

	public clearSelection() {
		this.handleOverlay.replaceChildren();
		this.prevSelectionBox = this.selectionBox;
		this.selectionBox = null;

		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}
}
