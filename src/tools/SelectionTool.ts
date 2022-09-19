// Allows users to select/transform portions of the `EditorImage`.
// With respect to `extend`ing, `SelectionTool` is not stable.
// @packageDocumentation

import Command from '../commands/Command';
import Duplicate from '../commands/Duplicate';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import Editor from '../Editor';
import Mat33 from '../math/Mat33';
import Rect2 from '../math/Rect2';
import { Point2, Vec2 } from '../math/Vec2';
import { EditorLocalization } from '../localization';
import { EditorEventType, KeyPressEvent, KeyUpEvent, PointerEvt } from '../types';
import Viewport from '../Viewport';
import BaseTool from './BaseTool';
import SerializableCommand from '../commands/SerializableCommand';

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

// @internal
class Selection {
	public region: Rect2;
	private boxRotation: number;
	private backgroundBox: HTMLElement;
	private rotateCircle: HTMLElement;
	private selectedElems: AbstractComponent[];
	private transform: Mat33;
	private transformationCommands: SerializableCommand[];

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
		}, () => this.finalizeTransform());

		makeDraggable(resizeCorner, (deltaPosition) => {
			this.handleResizeCornerDrag(deltaPosition);
		}, () => this.finalizeTransform());

		makeDraggable(this.rotateCircle, (_deltaPosition, offset) => {
			this.handleRotateCircleDrag(offset);
		}, () => this.finalizeTransform());
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

		this.transformPreview(Mat33.translation(deltaPosition));
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
			const scaleFactor = Vec2.of(newSize.x / oldWidth, newSize.y / oldHeight);

			this.transformPreview(Mat33.scaling2D(scaleFactor, this.region.topLeft));
		}
	}

	public handleRotateCircleDrag(offset: Vec2) {
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

		this.transformPreview(Mat33.zRotation(deltaRotation, this.region.center));
	}

	private computeTransformCommands(): SerializableCommand[] {
		return this.selectedElems.map(elem => {
			return elem.transformBy(this.transform);
		});
	}

	// Applies, previews, but doesn't finalize the given transformation.
	public transformPreview(transform: Mat33) {
		this.transform = this.transform.rightMul(transform);
		const deltaRotation = transform.transformVec3(Vec2.unitX).angle();
		transform = transform.rightMul(Mat33.zRotation(-deltaRotation, this.region.center));

		this.boxRotation += deltaRotation;
		this.boxRotation = this.boxRotation % (2 * Math.PI);
		if (this.boxRotation < 0) {
			this.boxRotation += 2 * Math.PI;
		}

		const newSize = transform.transformVec3(this.region.size);
		const translation = transform.transformVec2(this.region.topLeft).minus(this.region.topLeft);
		this.region = this.region.resizedTo(newSize);
		this.region = this.region.translatedBy(translation);

		this.previewTransformCmds();
		this.scrollTo();
	}

	// Applies the current transformation to the selection
	public finalizeTransform() {
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
			this, currentTransfmCommands, fullTransform, deltaBoxRotation
		));
	}

	static {
		SerializableCommand.register('selection-tool-transform', (json: any, editor) => {
			// The selection box is lost when serializing/deserializing. No need to store box rotation
			const guiBoxRotation = 0;
			const fullTransform: Mat33 = new Mat33(...(json.transform as [
				number, number, number,
				number, number, number,
				number, number, number,
			]));
			const commands = (json.commands as any[]).map(data => SerializableCommand.deserialize(data, editor));

			return new this.ApplyTransformationCommand(null, commands, fullTransform, guiBoxRotation);
		});
	}

	private static ApplyTransformationCommand = class extends SerializableCommand {
		public constructor(
			private selection: Selection|null,
			private currentTransfmCommands: SerializableCommand[],
			private fullTransform: Mat33,
			private deltaBoxRotation: number,
		) {
			super('selection-tool-transform');
		}

		public async apply(editor: Editor) {
			// Approximate the new selection
			if (this.selection) {
				this.selection.region = this.selection.region.transformedBoundingBox(this.fullTransform);
				this.selection.boxRotation += this.deltaBoxRotation;
				this.selection.updateUI();
			}

			await editor.asyncApplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection?.recomputeRegion();
			this.selection?.updateUI();
		}

		public async unapply(editor: Editor) {
			if (this.selection) {
				this.selection.region = this.selection.region.transformedBoundingBox(this.fullTransform.inverse());
				this.selection.boxRotation -= this.deltaBoxRotation;
				this.selection.updateUI();
			}

			await editor.asyncUnapplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection?.recomputeRegion();
			this.selection?.updateUI();
		}

		protected serializeToJSON() {
			return {
				commands: this.currentTransfmCommands.map(command => command.serialize()),
				transform: this.fullTransform.toArray(),
			};
		}

		public description(_editor: Editor, localizationTable: EditorLocalization) {
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

	// Scroll the viewport to this. Does not zoom
	public scrollTo() {
		const viewport = this.editor.viewport;
		const visibleRect = viewport.visibleRect;
		if (!visibleRect.containsPoint(this.region.center)) {
			const closestPoint = visibleRect.getClosestPointOnBoundaryTo(this.region.center);
			const delta = this.region.center.minus(closestPoint);
			this.editor.dispatchNoAnnounce(
				Viewport.transformBy(Mat33.translation(delta.times(-1))), false
			);
		}
	}

	public deleteSelectedObjects(): Command {
		return new Erase(this.selectedElems);
	}

	public duplicateSelectedObjects(): Command {
		return new Duplicate(this.selectedElems);
	}
}

// {@inheritDoc SelectionTool!}
export default class SelectionTool extends BaseTool {
	private handleOverlay: HTMLElement;
	private prevSelectionBox: Selection|null;
	private selectionBox: Selection|null;

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

		this.editor.handleKeyEventsFrom(this.handleOverlay);
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
			this.zoomToSelection();
		}
	}

	private zoomToSelection() {
		if (this.selectionBox) {
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

	private static handleableKeys = [
		'a', 'h', 'ArrowLeft',
		'd', 'l', 'ArrowRight',
		'q', 'k', 'ArrowUp',
		'e', 'j', 'ArrowDown',
		'r', 'R',
		'i', 'I', 'o', 'O',
	];
	public onKeyPress(event: KeyPressEvent): boolean {
		let rotationSteps = 0;
		let xTranslateSteps = 0;
		let yTranslateSteps = 0;
		let xScaleSteps = 0;
		let yScaleSteps = 0;

		switch (event.key) {
		case 'a':
		case 'h':
		case 'ArrowLeft':
			xTranslateSteps -= 1;
			break;
		case 'd':
		case 'l':
		case 'ArrowRight':
			xTranslateSteps += 1;
			break;
		case 'q':
		case 'k':
		case 'ArrowUp':
			yTranslateSteps -= 1;
			break;
		case 'e':
		case 'j':
		case 'ArrowDown':
			yTranslateSteps += 1;
			break;
		case 'r':
			rotationSteps += 1;
			break;
		case 'R':
			rotationSteps -= 1;
			break;
		case 'i':
			xScaleSteps -= 1;
			break;
		case 'I':
			xScaleSteps += 1;
			break;
		case 'o':
			yScaleSteps -= 1;
			break;
		case 'O':
			yScaleSteps += 1;
			break;
		}

		let handled = xTranslateSteps !== 0
			|| yTranslateSteps !== 0
			|| rotationSteps !== 0
			|| xScaleSteps !== 0
			|| yScaleSteps !== 0;

		if (!this.selectionBox) {
			handled = false;
		} else if (handled) {
			const translateStepSize = 10 * this.editor.viewport.getSizeOfPixelOnCanvas();
			const rotateStepSize = Math.PI / 8;
			const scaleStepSize = translateStepSize / 2;

			const region = this.selectionBox.region;
			const scaledSize = this.selectionBox.region.size.plus(
				Vec2.of(xScaleSteps, yScaleSteps).times(scaleStepSize)
			);

			const transform = Mat33.scaling2D(
				Vec2.of(
					// Don't more-than-half the size of the selection
					Math.max(0.5, scaledSize.x / region.size.x),
					Math.max(0.5, scaledSize.y / region.size.y)
				),
				region.topLeft
			).rightMul(Mat33.zRotation(
				rotationSteps * rotateStepSize, region.center
			)).rightMul(Mat33.translation(
				Vec2.of(xTranslateSteps, yTranslateSteps).times(translateStepSize)
			));
			this.selectionBox.transformPreview(transform);
		}

		return handled;
	}

	public onKeyUp(evt: KeyUpEvent) {
		if (this.selectionBox && SelectionTool.handleableKeys.some(key => key === evt.key)) {
			this.selectionBox.finalizeTransform();
			return true;
		}
		return false;
	}

	public setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		// Clear the selection
		this.handleOverlay.replaceChildren();
		this.selectionBox = null;

		this.handleOverlay.style.display = enabled ? 'block' : 'none';

		if (enabled) {
			this.handleOverlay.tabIndex = 0;
			this.handleOverlay.setAttribute('aria-label', this.editor.localization.selectionToolKeyboardShortcuts);
		} else {
			this.handleOverlay.tabIndex = -1;
		}
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
