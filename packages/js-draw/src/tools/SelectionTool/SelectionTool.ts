import AbstractComponent from '../../components/AbstractComponent';
import Editor from '../../Editor';
import Mat33 from '../../math/Mat33';
import Rect2 from '../../math/Rect2';
import { Point2, Vec2 } from '../../math/Vec2';
import { CopyEvent, EditorEventType, KeyPressEvent, KeyUpEvent, PointerEvt } from '../../types';
import Viewport from '../../Viewport';
import BaseTool from '../BaseTool';
import SVGRenderer from '../../rendering/renderers/SVGRenderer';
import Selection from './Selection';
import TextComponent from '../../components/TextComponent';

export const cssPrefix = 'selection-tool-';

// Allows users to select/transform portions of the `EditorImage`.
// With respect to `extend`ing, `SelectionTool` is not stable.
export default class SelectionTool extends BaseTool {
	private handleOverlay: HTMLElement;
	private prevSelectionBox: Selection|null;
	private selectionBox: Selection|null;
	private lastEvtTarget: EventTarget|null = null;

	private startPoint: Vec2|null = null; // canvas position
	private expandingSelectionBox: boolean = false;
	private shiftKeyPressed: boolean = false;
	private ctrlKeyPressed: boolean = false;

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);

		this.handleOverlay = document.createElement('div');
		editor.createHTMLOverlay(this.handleOverlay);

		this.handleOverlay.style.display = 'none';
		this.handleOverlay.classList.add('handleOverlay');

		editor.notifier.on(EditorEventType.ViewportChanged, _data => {
			// The selection box could be using the wet ink display if its transformation
			// hasn't been finalized yet. Clear before updating the UI.
			this.editor.clearWetInk();

			this.selectionBox?.updateUI();
		});

		this.editor.handleKeyEventsFrom(this.handleOverlay);
		this.editor.handlePointerEventsFrom(this.handleOverlay, (eventName, htmlEvent: PointerEvent) => {
			if (eventName === 'pointerdown') {
				this.lastEvtTarget = htmlEvent.target;
			}
			return true;
		});
	}

	private makeSelectionBox(selectionStartPos: Point2) {
		this.prevSelectionBox = this.selectionBox;
		this.selectionBox = new Selection(
			selectionStartPos, this.editor
		);

		if (!this.expandingSelectionBox) {
			// Remove any previous selection rects
			this.prevSelectionBox?.cancelSelection();
		}
		this.selectionBox.addTo(this.handleOverlay);
	}

	private snapSelectionToGrid() {
		if (!this.selectionBox) throw new Error('No selection to snap!');

		// Snap the top left corner of what we have selected.
		const topLeftOfBBox = this.selectionBox.computeTightBoundingBox().topLeft;
		const snappedTopLeft = this.editor.viewport.snapToGrid(topLeftOfBBox);
		const snapDelta = snappedTopLeft.minus(topLeftOfBBox);

		const oldTransform = this.selectionBox.getTransform();
		this.selectionBox.setTransform(oldTransform.rightMul(Mat33.translation(snapDelta)));
		this.selectionBox.finalizeTransform();
	}

	private selectionBoxHandlingEvt: boolean = false;
	public override onPointerDown({ allPointers, current }: PointerEvt): boolean {
		const snapToGrid = this.ctrlKeyPressed;
		if (snapToGrid) {
			current = current.snappedToGrid(this.editor.viewport);
		}

		if (allPointers.length === 1 && current.isPrimary) {
			this.startPoint = current.canvasPos;

			let transforming = false;

			if (this.lastEvtTarget && this.selectionBox) {
				if (snapToGrid) {
					this.snapSelectionToGrid();
				}

				const dragStartResult = this.selectionBox.onDragStart(current, this.lastEvtTarget);

				if (dragStartResult) {
					transforming = true;

					this.selectionBoxHandlingEvt = true;
					this.expandingSelectionBox = false;
				}
			}

			if (!transforming) {
				// Shift key: Combine the new and old selection boxes at the end of the gesture.
				this.expandingSelectionBox = this.shiftKeyPressed;
				this.makeSelectionBox(current.canvasPos);
			}

			return true;
		}
		return false;
	}

	public override onPointerMove(event: PointerEvt): void {
		if (!this.selectionBox) return;

		let currentPointer = event.current;
		if (!this.expandingSelectionBox && this.shiftKeyPressed && this.startPoint) {
			const screenPos = this.editor.viewport.canvasToScreen(this.startPoint);
			currentPointer = currentPointer.lockedToXYAxesScreen(screenPos, this.editor.viewport);
		}

		if (this.ctrlKeyPressed) {
			currentPointer = currentPointer.snappedToGrid(this.editor.viewport);
		}

		if (this.selectionBoxHandlingEvt) {
			this.selectionBox.onDragUpdate(currentPointer);
		} else {
			this.selectionBox!.setToPoint(currentPointer.canvasPos);
		}
	}

	private onSelectionUpdated() {
		// Note that the selection has changed
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});

		const selectedItemCount = this.selectionBox?.getSelectedItemCount() ?? 0;
		if (selectedItemCount > 0) {
			this.editor.announceForAccessibility(
				this.editor.localization.selectedElements(selectedItemCount)
			);
			this.zoomToSelection();
		} else if (this.selectionBox) {
			this.selectionBox.cancelSelection();
			this.prevSelectionBox = this.selectionBox;
			this.selectionBox = null;
		}
	}

	// Called after a gestureCancel and a pointerUp
	private onGestureEnd() {
		this.lastEvtTarget = null;

		if (!this.selectionBox) return;

		if (!this.selectionBoxHandlingEvt) {
			// Expand/shrink the selection rectangle, if applicable
			this.selectionBox.resolveToObjects();
			this.onSelectionUpdated();
		} else {
			this.selectionBox.onDragEnd();
		}


		this.selectionBoxHandlingEvt = false;
	}

	private zoomToSelection() {
		if (this.selectionBox) {
			const selectionRect = this.selectionBox.region;
			this.editor.dispatchNoAnnounce(this.editor.viewport.zoomTo(selectionRect, false), false);
		}
	}

	public override onPointerUp(event: PointerEvt): void {
		if (!this.selectionBox) return;

		let currentPointer = event.current;
		if (this.ctrlKeyPressed) {
			currentPointer = currentPointer.snappedToGrid(this.editor.viewport);
		}

		this.selectionBox.setToPoint(currentPointer.canvasPos);

		// Were we expanding the previous selection?
		if (this.expandingSelectionBox && this.prevSelectionBox) {
			// If so, finish expanding.
			this.expandingSelectionBox = false;
			this.selectionBox.resolveToObjects();
			this.setSelection([
				...this.selectionBox.getSelectedObjects(),
				...this.prevSelectionBox.getSelectedObjects(),
			]);
		} else {
			this.onGestureEnd();
		}
	}

	public override onGestureCancel(): void {
		if (this.selectionBoxHandlingEvt) {
			this.selectionBox?.onDragCancel();
		} else {
			// Revert to the previous selection, if any.
			this.selectionBox?.cancelSelection();
			this.selectionBox = this.prevSelectionBox;
			this.selectionBox?.addTo(this.handleOverlay);
			this.selectionBox?.recomputeRegion();
			this.prevSelectionBox = null;
		}

		this.expandingSelectionBox = false;
	}

	private static handleableKeys = [
		'a', 'h', 'ArrowLeft',
		'd', 'l', 'ArrowRight',
		'q', 'k', 'ArrowUp',
		'e', 'j', 'ArrowDown',
		'r', 'R',
		'i', 'I', 'o', 'O',
		'Control', 'Meta',
	];
	public override onKeyPress(event: KeyPressEvent): boolean {
		if (event.key === 'Control' || event.key === 'Meta') {
			this.ctrlKeyPressed = true;
			return true;
		}

		if (this.selectionBox && event.ctrlKey && event.key === 'd') {
			// Handle duplication on key up — we don't want to accidentally duplicate
			// many times.
			return true;
		}
		else if (event.key === 'a' && event.ctrlKey) {
			this.setSelection(this.editor.image.getAllElements());
			return true;
		}
		else if (event.ctrlKey) {
			// Don't transform the selection with, for example, ctrl+i.
			// Pass it to another tool, if apliccable.
			return false;
		}
		else if (event.key === 'Shift') {
			this.shiftKeyPressed = true;
			return true;
		}

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
			const scaleStepSize = 5 / 4;

			const region = this.selectionBox.region;
			const scaleFactor = Vec2.of(scaleStepSize ** xScaleSteps, scaleStepSize ** yScaleSteps);

			const rotationMat = Mat33.zRotation(
				rotationSteps * rotateStepSize
			);
			const roundedRotationMatrix = rotationMat.mapEntries(component => Viewport.roundScaleRatio(component));
			const regionCenter = this.editor.viewport.roundPoint(region.center);

			const transform = Mat33.scaling2D(
				scaleFactor,
				this.editor.viewport.roundPoint(region.topLeft)
			).rightMul(
				Mat33.translation(regionCenter).rightMul(
					roundedRotationMatrix
				).rightMul(
					Mat33.translation(regionCenter.times(-1))
				)
			).rightMul(Mat33.translation(
				this.editor.viewport.roundPoint(Vec2.of(xTranslateSteps, yTranslateSteps).times(translateStepSize))
			));
			const oldTransform = this.selectionBox.getTransform();
			this.selectionBox.setTransform(oldTransform.rightMul(transform));
		}

		if (this.selectionBox && !handled && (event.key === 'Delete' || event.key === 'Backspace')) {
			this.editor.dispatch(this.selectionBox.deleteSelectedObjects());
			this.clearSelection();
			handled = true;
		}

		return handled;
	}

	public override onKeyUp(evt: KeyUpEvent) {
		if (evt.key === 'Control' || evt.key === 'Meta') {
			this.ctrlKeyPressed = false;
			return true;
		}

		if (evt.key === 'Shift') {
			this.shiftKeyPressed = false;
			return true;
		}
		else if (evt.ctrlKey) {
			if (this.selectionBox && evt.key === 'd') {
				this.selectionBox.duplicateSelectedObjects().then(command => {
					this.editor.dispatch(command);
				});
				return true;
			}

			if (evt.key === 'a' || evt.key === 'r') {
				// Selected all in onKeyDown. Don't finalizeTransform.
				return true;
			}
		}

		if (this.selectionBox && SelectionTool.handleableKeys.some(key => key === evt.key)) {
			this.selectionBox.finalizeTransform();
			return true;
		}
		return false;
	}

	public override onCopy(event: CopyEvent): boolean {
		if (!this.selectionBox) {
			return false;
		}

		const selectedElems = this.selectionBox.getSelectedObjects();
		const bbox = this.selectionBox.region;
		if (selectedElems.length === 0) {
			return false;
		}

		const exportViewport = new Viewport(() => {});
		exportViewport.updateScreenSize(Vec2.of(bbox.w, bbox.h));
		exportViewport.resetTransform(Mat33.translation(bbox.topLeft.times(-1)));

		const sanitize = true;
		const { element: svgExportElem, renderer: svgRenderer } = SVGRenderer.fromViewport(exportViewport, sanitize);

		const text: string[] = [];
		for (const elem of selectedElems) {
			elem.render(svgRenderer);

			if (elem instanceof TextComponent) {
				text.push(elem.getText());
			}
		}

		event.setData('image/svg+xml', svgExportElem.outerHTML);
		event.setData('text/html', svgExportElem.outerHTML);
		if (text.length > 0) {
			event.setData('text/plain', text.join('\n'));
		}
		return true;
	}

	public override setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		// Clear the selection
		this.handleOverlay.replaceChildren();
		this.selectionBox = null;

		this.shiftKeyPressed = false;
		this.ctrlKeyPressed = false;

		this.handleOverlay.style.display = enabled ? 'block' : 'none';

		if (enabled) {
			this.handleOverlay.tabIndex = 0;
			this.handleOverlay.setAttribute('aria-label', this.editor.localization.selectionToolKeyboardShortcuts);
		} else {
			this.handleOverlay.tabIndex = -1;
		}
	}

	// Get the object responsible for displaying this' selection.
	// @internal
	public getSelection(): Selection|null {
		return this.selectionBox;
	}

	public getSelectedObjects(): AbstractComponent[] {
		return this.selectionBox?.getSelectedObjects() ?? [];
	}

	// Select the given `objects`. Any non-selectable objects in `objects` are ignored.
	public setSelection(objects: AbstractComponent[]) {
		// Only select selectable objects.
		objects = objects.filter(obj => obj.isSelectable());

		// Sort by z-index
		objects.sort((a, b) => a.getZIndex() - b.getZIndex());

		// Remove duplicates
		objects = objects.filter((current, idx) => {
			if (idx > 0) {
				return current !== objects[idx - 1];
			}

			return true;
		});

		let bbox: Rect2|null = null;
		for (const object of objects) {
			if (bbox) {
				bbox = bbox.union(object.getBBox());
			} else {
				bbox = object.getBBox();
			}
		}

		if (!bbox) {
			return;
		}

		this.clearSelection();
		if (!this.selectionBox) {
			this.makeSelectionBox(bbox.topLeft);
		}

		this.selectionBox!.setSelectedObjects(objects, bbox);
		this.onSelectionUpdated();
	}

	public clearSelection() {
		this.handleOverlay.replaceChildren();
		this.prevSelectionBox = this.selectionBox;
		this.selectionBox = null;

		this.onSelectionUpdated();
	}
}
