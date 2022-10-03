// Allows users to select/transform portions of the `EditorImage`.
// With respect to `extend`ing, `SelectionTool` is not stable.
// @packageDocumentation

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
import TextComponent from '../../components/Text';

export const cssPrefix = 'selection-tool-';

// {@inheritDoc SelectionTool!}
export default class SelectionTool extends BaseTool {
	private handleOverlay: HTMLElement;
	private prevSelectionBox: Selection|null;
	private selectionBox: Selection|null;
	private lastEvtTarget: EventTarget|null = null;

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);

		this.handleOverlay = document.createElement('div');
		editor.createHTMLOverlay(this.handleOverlay);

		this.handleOverlay.style.display = 'none';
		this.handleOverlay.classList.add('handleOverlay');

		editor.notifier.on(EditorEventType.ViewportChanged, _data => {
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
		// Remove any previous selection rects
		this.handleOverlay.replaceChildren();
		this.selectionBox.addTo(this.handleOverlay);
	}

	private selectionBoxHandlingEvt: boolean = false;
	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 && event.current.isPrimary) {
			if (this.lastEvtTarget && this.selectionBox?.onDragStart(event.current, this.lastEvtTarget)) {
				this.selectionBoxHandlingEvt = true;
			} else {
				this.makeSelectionBox(event.current.canvasPos);
			}

			return true;
		}
		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		if (!this.selectionBox) return;

		if (this.selectionBoxHandlingEvt) {
			this.selectionBox.onDragUpdate(event.current);
		} else {
			this.selectionBox!.setToPoint(event.current.canvasPos);
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

	public onPointerUp(event: PointerEvt): void {
		if (!this.selectionBox) return;

		this.selectionBox.setToPoint(event.current.canvasPos);
		this.onGestureEnd();
	}

	public onGestureCancel(): void {
		if (this.selectionBoxHandlingEvt) {
			this.selectionBox?.onDragCancel();
		} else {
			// Revert to the previous selection, if any.
			this.selectionBox?.cancelSelection();
			this.selectionBox = this.prevSelectionBox;
			this.selectionBox?.addTo(this.handleOverlay);
		}
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
		// Duplicate the selection.
		if (this.selectionBox && event.key === 'd' && event.ctrlKey) {
			this.editor.dispatch(this.selectionBox.duplicateSelectedObjects());
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

	public onKeyUp(evt: KeyUpEvent) {
		if (this.selectionBox && SelectionTool.handleableKeys.some(key => key === evt.key)) {
			this.selectionBox.finalizeTransform();
			return true;
		}
		return false;
	}

	public onCopy(event: CopyEvent): boolean {
		if (!this.selectionBox) {
			return false;
		}

		const selectedElems = this.selectionBox.getSelectedObjects();
		const bbox = this.selectionBox.region;
		if (selectedElems.length === 0) {
			return false;
		}

		const exportViewport = new Viewport(this.editor.notifier);
		exportViewport.updateScreenSize(Vec2.of(bbox.w, bbox.h));
		exportViewport.resetTransform(Mat33.translation(bbox.topLeft));

		const svgNameSpace = 'http://www.w3.org/2000/svg';
		const exportElem = document.createElementNS(svgNameSpace, 'svg');

		const sanitize = true;
		const renderer = new SVGRenderer(exportElem, exportViewport, sanitize);

		const text: string[] = [];
		for (const elem of selectedElems) {
			elem.render(renderer);

			if (elem instanceof TextComponent) {
				text.push(elem.getText());
			}
		}

		event.setData('image/svg+xml', exportElem.outerHTML);
		if (text.length > 0) {
			event.setData('text/plain', text.join('\n'));
		}
		return true;
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

	public setSelection(objects: AbstractComponent[]) {
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
