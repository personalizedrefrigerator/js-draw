import AbstractComponent from '../../components/AbstractComponent';
import Editor from '../../Editor';
import { Mat33, Rect2, Point2, Vec2, Color4 } from '@js-draw/math';
import { EditorEventType } from '../../types';
import {
	ContextMenuEvt,
	CopyEvent,
	KeyPressEvent,
	KeyUpEvent,
	PointerEvt,
} from '../../inputEvents';
import Viewport from '../../Viewport';
import BaseTool from '../BaseTool';
import CanvasRenderer from '../../rendering/renderers/CanvasRenderer';
import SVGRenderer from '../../rendering/renderers/SVGRenderer';
import Selection from './Selection';
import TextComponent from '../../components/TextComponent';
import {
	duplicateSelectionShortcut,
	translateLeftSelectionShortcutId,
	translateRightSelectionShortcutId,
	selectAllKeyboardShortcut,
	sendToBackSelectionShortcut,
	snapToGridKeyboardShortcutId,
	translateDownSelectionShortcutId,
	translateUpSelectionShortcutId,
	rotateClockwiseSelectionShortcutId,
	rotateCounterClockwiseSelectionShortcutId,
	stretchXSelectionShortcutId,
	shrinkXSelectionShortcutId,
	shrinkYSelectionShortcutId,
	stretchYSelectionShortcutId,
	stretchXYSelectionShortcutId,
	shrinkXYSelectionShortcutId,
} from '../keybindings';
import ToPointerAutoscroller from './ToPointerAutoscroller';
import Pointer from '../../Pointer';
import showSelectionContextMenu from './util/showSelectionContextMenu';
import { MutableReactiveValue } from '../../util/ReactiveValue';
import SelectionBuilder from './SelectionBuilders/SelectionBuilder';
import { SelectionMode } from './types';
import LassoSelectionBuilder from './SelectionBuilders/LassoSelectionBuilder';
import RectSelectionBuilder from './SelectionBuilders/RectSelectionBuilder';

export const cssPrefix = 'selection-tool-';

export { SelectionMode };

// Allows users to select/transform portions of the `EditorImage`.
// With respect to `extend`ing, `SelectionTool` is not stable.
export default class SelectionTool extends BaseTool {
	public readonly modeValue: MutableReactiveValue<SelectionMode>;
	private selectionBuilder: SelectionBuilder | null;

	private handleOverlay: HTMLElement;
	private prevSelectionBox: Selection | null;
	private selectionBox: Selection | null;

	// True if clearing and recreating the selectionBox has been deferred. This is used to prevent the selection
	// from vanishing on pointerdown events that are intended to form other gestures (e.g. long press) that would
	// ultimately restore the selection.
	private removeSelectionScheduled = false;

	private startPoint: Vec2 | null = null; // canvas position
	private expandingSelectionBox: boolean = false;
	private shiftKeyPressed: boolean = false;
	private snapToGrid: boolean = false;

	private lastPointer: Pointer | null = null;

	private autoscroller: ToPointerAutoscroller;

	public constructor(
		private editor: Editor,
		description: string,
	) {
		super(editor.notifier, description);

		this.modeValue = MutableReactiveValue.fromInitialValue(SelectionMode.Rectangle);
		this.modeValue.onUpdate(() => {
			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		});

		this.autoscroller = new ToPointerAutoscroller(editor.viewport, (scrollBy: Vec2) => {
			editor.dispatch(Viewport.transformBy(Mat33.translation(scrollBy)), false);

			// Update the selection box/content to match the new viewport.
			if (this.lastPointer) {
				// The viewport has changed -- ensure that the screen and canvas positions
				// of the pointer are both correct
				const updatedPointer = this.lastPointer.withScreenPosition(
					this.lastPointer.screenPos,
					editor.viewport,
				);
				this.onMainPointerUpdated(updatedPointer);
			}
		});

		this.handleOverlay = document.createElement('div');
		editor.createHTMLOverlay(this.handleOverlay);

		this.handleOverlay.style.display = 'none';
		this.handleOverlay.classList.add('handleOverlay');

		editor.notifier.on(EditorEventType.ViewportChanged, (_data) => {
			// The selection box could be using the wet ink display if its transformation
			// hasn't been finalized yet. Clear before updating the UI.
			this.editor.clearWetInk();

			// If not currently selecting, ensure that the selection box
			// is large enough.
			if (!this.expandingSelectionBox) {
				this.selectionBox?.padRegion();
			}
			this.selectionBox?.updateUI();
		});

		this.editor.handleKeyEventsFrom(this.handleOverlay);
		this.editor.handlePointerEventsFrom(this.handleOverlay);
	}

	private getSelectionColor() {
		const colorString = getComputedStyle(this.handleOverlay).getPropertyValue(
			'--selection-background-color',
		);
		return Color4.fromString(colorString).withAlpha(0.5);
	}

	private makeSelectionBox(selectedObjects: AbstractComponent[]) {
		this.prevSelectionBox = this.selectionBox;
		this.selectionBox = new Selection(selectedObjects, this.editor, this.showContextMenu);

		if (!this.expandingSelectionBox) {
			// Remove any previous selection rects
			this.prevSelectionBox?.cancelSelection();
		}
		this.selectionBox.addTo(this.handleOverlay);
	}

	private showContextMenu = async (canvasAnchor: Point2, preferSelectionMenu = true) => {
		await showSelectionContextMenu(
			this.selectionBox,
			this.editor,
			canvasAnchor,
			preferSelectionMenu,
			() => this.clearSelection(),
		);
	};

	public override onContextMenu(event: ContextMenuEvt): boolean {
		const canShowSelectionMenu = this.selectionBox
			?.getScreenRegion()
			?.containsPoint(event.screenPos);
		void this.showContextMenu(event.canvasPos, canShowSelectionMenu);
		return true;
	}

	private selectionBoxHandlingEvt: boolean = false;
	public override onPointerDown({ allPointers, current }: PointerEvt): boolean {
		const snapToGrid = this.snapToGrid;
		if (snapToGrid) {
			current = current.snappedToGrid(this.editor.viewport);
		}

		// Don't rely on .isPrimary -- it's buggy in Firefox. See https://github.com/personalizedrefrigerator/js-draw/issues/71
		if (allPointers.length === 1) {
			this.startPoint = current.canvasPos;

			let transforming = false;

			if (this.selectionBox) {
				if (snapToGrid) {
					this.selectionBox.snapSelectedObjectsToGrid();
				}

				const dragStartResult = this.selectionBox.onDragStart(current);

				if (dragStartResult) {
					transforming = true;

					this.selectionBoxHandlingEvt = true;
					this.expandingSelectionBox = false;
				}
			}

			if (!transforming) {
				// Shift key: Combine the new and old selection boxes at the end of the gesture.
				this.expandingSelectionBox = this.shiftKeyPressed;
				this.removeSelectionScheduled = !this.expandingSelectionBox;

				if (this.modeValue.get() === SelectionMode.Lasso) {
					this.selectionBuilder = new LassoSelectionBuilder(
						current.canvasPos,
						this.editor.viewport,
					);
				} else {
					this.selectionBuilder = new RectSelectionBuilder(current.canvasPos);
				}
			} else {
				// Only autoscroll if we're transforming an existing selection
				this.autoscroller.start();
			}

			return true;
		}
		return false;
	}

	public override onPointerMove(event: PointerEvt): void {
		this.onMainPointerUpdated(event.current);
	}

	private onMainPointerUpdated(currentPointer: Pointer) {
		this.lastPointer = currentPointer;

		if (this.removeSelectionScheduled) {
			this.removeSelectionScheduled = false;

			this.handleOverlay.replaceChildren();
			this.prevSelectionBox = this.selectionBox;
			this.selectionBox = null;
		}

		this.autoscroller.onPointerMove(currentPointer.screenPos);

		if (!this.expandingSelectionBox && this.shiftKeyPressed && this.startPoint) {
			const screenPos = this.editor.viewport.canvasToScreen(this.startPoint);
			currentPointer = currentPointer.lockedToXYAxesScreen(screenPos, this.editor.viewport);
		}

		if (this.snapToGrid) {
			currentPointer = currentPointer.snappedToGrid(this.editor.viewport);
		}

		if (this.selectionBoxHandlingEvt) {
			this.selectionBox?.onDragUpdate(currentPointer);
		} else {
			this.selectionBuilder?.onPointerMove(currentPointer.canvasPos);
			this.editor.clearWetInk();
			this.selectionBuilder?.render(
				this.editor.display.getWetInkRenderer(),
				this.getSelectionColor(),
			);
		}
	}

	public override onPointerUp(event: PointerEvt): void {
		this.onMainPointerUpdated(event.current);
		this.autoscroller.stop();

		if (this.selectionBoxHandlingEvt) {
			this.selectionBox?.onDragEnd();
		} else if (this.selectionBuilder) {
			const newSelection = this.selectionBuilder.resolve(this.editor.image, this.editor.viewport);
			this.selectionBuilder = null;
			this.editor.clearWetInk();

			if (this.expandingSelectionBox && this.selectionBox) {
				this.setSelection([...this.selectionBox.getSelectedObjects(), ...newSelection]);
			} else {
				this.setSelection(newSelection);
			}
		}

		this.expandingSelectionBox = false;
		this.removeSelectionScheduled = false;
		this.selectionBoxHandlingEvt = false;
		this.lastPointer = null;
	}

	public override onGestureCancel(): void {
		if (this.selectionBuilder) {
			this.selectionBuilder = null;
			this.editor.clearWetInk();
		}

		this.autoscroller.stop();
		if (this.selectionBoxHandlingEvt) {
			this.selectionBox?.onDragCancel();
		} else if (!this.removeSelectionScheduled) {
			// Revert to the previous selection, if any.
			this.selectionBox?.cancelSelection();
			this.selectionBox = this.prevSelectionBox;
			this.selectionBox?.addTo(this.handleOverlay);
			this.selectionBox?.recomputeRegion();
			this.prevSelectionBox = null;
		}

		this.removeSelectionScheduled = false;
		this.expandingSelectionBox = false;
		this.lastPointer = null;
		this.selectionBoxHandlingEvt = false;
	}

	private lastSelectedObjects: AbstractComponent[] = [];

	private onSelectionUpdated() {
		const selectedItemCount = this.selectionBox?.getSelectedItemCount() ?? 0;
		const selectedObjects = this.selectionBox?.getSelectedObjects() ?? [];
		const hasDifferentSelection =
			this.lastSelectedObjects.length !== selectedItemCount ||
			selectedObjects.some((obj, i) => this.lastSelectedObjects[i] !== obj);

		if (hasDifferentSelection) {
			this.lastSelectedObjects = selectedObjects;

			// Note that the selection has changed
			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});

			// Only fire the SelectionUpdated event if the selection really updated.
			this.editor.notifier.dispatch(EditorEventType.SelectionUpdated, {
				kind: EditorEventType.SelectionUpdated,
				selectedComponents: selectedObjects,
				tool: this,
			});

			if (selectedItemCount > 0) {
				this.editor.announceForAccessibility(
					this.editor.localization.selectedElements(selectedItemCount),
				);
				this.zoomToSelection();
			}
		}

		if (selectedItemCount === 0 && this.selectionBox) {
			this.selectionBox.cancelSelection();
			this.prevSelectionBox = this.selectionBox;
			this.selectionBox = null;
		}
	}

	private zoomToSelection() {
		if (this.selectionBox) {
			const selectionRect = this.selectionBox.region;
			this.editor.dispatchNoAnnounce(this.editor.viewport.zoomTo(selectionRect, false), false);
		}
	}

	// Whether the last keypress corresponded to an action that didn't transform the
	// selection (and thus does not need to be finalized on onKeyUp).
	private hasUnfinalizedTransformFromKeyPress: boolean = false;

	public override onKeyPress(event: KeyPressEvent): boolean {
		const shortcucts = this.editor.shortcuts;

		if (shortcucts.matchesShortcut(snapToGridKeyboardShortcutId, event)) {
			this.snapToGrid = true;
			return true;
		}

		if (
			this.selectionBox &&
			(shortcucts.matchesShortcut(duplicateSelectionShortcut, event) ||
				shortcucts.matchesShortcut(sendToBackSelectionShortcut, event))
		) {
			// Handle duplication on key up — we don't want to accidentally duplicate
			// many times.
			return true;
		} else if (shortcucts.matchesShortcut(selectAllKeyboardShortcut, event)) {
			this.setSelection(this.editor.image.getAllElements());
			return true;
		} else if (event.ctrlKey) {
			// Don't transform the selection with, for example, ctrl+i.
			// Pass it to another tool, if apliccable.
			return false;
		} else if (event.shiftKey || event.key === 'Shift') {
			this.shiftKeyPressed = true;

			if (event.key === 'Shift') {
				return true;
			}
		}

		let rotationSteps = 0;
		let xTranslateSteps = 0;
		let yTranslateSteps = 0;
		let xScaleSteps = 0;
		let yScaleSteps = 0;

		if (shortcucts.matchesShortcut(translateLeftSelectionShortcutId, event)) {
			xTranslateSteps -= 1;
		} else if (shortcucts.matchesShortcut(translateRightSelectionShortcutId, event)) {
			xTranslateSteps += 1;
		} else if (shortcucts.matchesShortcut(translateUpSelectionShortcutId, event)) {
			yTranslateSteps -= 1;
		} else if (shortcucts.matchesShortcut(translateDownSelectionShortcutId, event)) {
			yTranslateSteps += 1;
		} else if (shortcucts.matchesShortcut(rotateClockwiseSelectionShortcutId, event)) {
			rotationSteps += 1;
		} else if (shortcucts.matchesShortcut(rotateCounterClockwiseSelectionShortcutId, event)) {
			rotationSteps -= 1;
		} else if (shortcucts.matchesShortcut(shrinkXSelectionShortcutId, event)) {
			xScaleSteps -= 1;
		} else if (shortcucts.matchesShortcut(stretchXSelectionShortcutId, event)) {
			xScaleSteps += 1;
		} else if (shortcucts.matchesShortcut(shrinkYSelectionShortcutId, event)) {
			yScaleSteps -= 1;
		} else if (shortcucts.matchesShortcut(stretchYSelectionShortcutId, event)) {
			yScaleSteps += 1;
		} else if (shortcucts.matchesShortcut(shrinkXYSelectionShortcutId, event)) {
			xScaleSteps -= 1;
			yScaleSteps -= 1;
		} else if (shortcucts.matchesShortcut(stretchXYSelectionShortcutId, event)) {
			xScaleSteps += 1;
			yScaleSteps += 1;
		}

		let handled =
			xTranslateSteps !== 0 ||
			yTranslateSteps !== 0 ||
			rotationSteps !== 0 ||
			xScaleSteps !== 0 ||
			yScaleSteps !== 0;

		if (!this.selectionBox) {
			handled = false;
		} else if (handled) {
			const translateStepSize = 10 * this.editor.viewport.getSizeOfPixelOnCanvas();
			const rotateStepSize = Math.PI / 8;
			const scaleStepSize = 5 / 4;

			const region = this.selectionBox.region;
			const scaleFactor = Vec2.of(scaleStepSize ** xScaleSteps, scaleStepSize ** yScaleSteps);

			const rotationMat = Mat33.zRotation(rotationSteps * rotateStepSize);
			const roundedRotationMatrix = rotationMat.mapEntries((component) =>
				Viewport.roundScaleRatio(component),
			);
			const regionCenter = this.editor.viewport.roundPoint(region.center);

			const transform = Mat33.scaling2D(
				scaleFactor,
				this.editor.viewport.roundPoint(region.topLeft),
			)
				.rightMul(
					Mat33.translation(regionCenter)
						.rightMul(roundedRotationMatrix)
						.rightMul(Mat33.translation(regionCenter.times(-1))),
				)
				.rightMul(
					Mat33.translation(
						this.editor.viewport.roundPoint(
							Vec2.of(xTranslateSteps, yTranslateSteps).times(translateStepSize),
						),
					),
				);
			const oldTransform = this.selectionBox.getTransform();
			this.selectionBox.setTransform(oldTransform.rightMul(transform));

			this.selectionBox.scrollTo();

			// The transformation needs to be finalized at some point (on key up)
			this.hasUnfinalizedTransformFromKeyPress = true;
		}

		if (this.selectionBox && !handled && (event.key === 'Delete' || event.key === 'Backspace')) {
			this.editor.dispatch(this.selectionBox.deleteSelectedObjects());
			this.clearSelection();
			handled = true;
		}

		return handled;
	}

	public override onKeyUp(evt: KeyUpEvent) {
		const shortcucts = this.editor.shortcuts;
		if (shortcucts.matchesShortcut(snapToGridKeyboardShortcutId, evt)) {
			this.snapToGrid = false;
			return true;
		}

		if (shortcucts.matchesShortcut(selectAllKeyboardShortcut, evt)) {
			// Selected all in onKeyDown. Don't finalizeTransform.
			return true;
		}

		if (this.selectionBox && shortcucts.matchesShortcut(duplicateSelectionShortcut, evt)) {
			// Finalize duplicating the selection
			this.selectionBox.duplicateSelectedObjects().then((command) => {
				this.editor.dispatch(command);
			});
			return true;
		}

		if (this.selectionBox && shortcucts.matchesShortcut(sendToBackSelectionShortcut, evt)) {
			const sendToBackCommand = this.selectionBox.sendToBack();
			if (sendToBackCommand) {
				this.editor.dispatch(sendToBackCommand);
			}
			return true;
		}

		// Here, we check if shiftKey === false because, as of this writing,
		// evt.shiftKey is an optional property. Being falsey could just mean
		// that it wasn't set.
		if (evt.shiftKey === false) {
			this.shiftKeyPressed = false;
			// Don't return immediately -- event may be otherwise handled
		}

		// Also check for key === 'Shift' (for the case where shiftKey is undefined)
		if (evt.key === 'Shift') {
			this.shiftKeyPressed = false;
			return true;
		}

		// If we don't need to finalize the transform
		if (!this.hasUnfinalizedTransformFromKeyPress) {
			return true;
		}

		if (this.selectionBox) {
			this.selectionBox.finalizeTransform();
			this.hasUnfinalizedTransformFromKeyPress = false;
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
		const selectionScreenSize = this.selectionBox
			.getScreenRegion()
			.size.times(this.editor.display.getDevicePixelRatio());

		// Update the viewport to have screen size roughly equal to the size of the selection box
		let scaleFactor =
			selectionScreenSize.maximumEntryMagnitude() / (bbox.size.maximumEntryMagnitude() || 1);

		// Round to a nearby power of two
		scaleFactor = Math.pow(2, Math.ceil(Math.log2(scaleFactor)));

		exportViewport.updateScreenSize(bbox.size.times(scaleFactor));
		exportViewport.resetTransform(
			Mat33.scaling2D(scaleFactor)
				// Move the selection onto the screen
				.rightMul(Mat33.translation(bbox.topLeft.times(-1))),
		);

		const { element: svgExportElem, renderer: svgRenderer } = SVGRenderer.fromViewport(
			exportViewport,
			{ sanitize: true, useViewBoxForPositioning: true },
		);
		const { element: canvas, renderer: canvasRenderer } = CanvasRenderer.fromViewport(
			exportViewport,
			{ maxCanvasDimen: 4096 },
		);

		const text: string[] = [];
		for (const elem of selectedElems) {
			elem.render(svgRenderer);
			elem.render(canvasRenderer);

			if (elem instanceof TextComponent) {
				text.push(elem.getText());
			}
		}

		event.setData('image/svg+xml', svgExportElem.outerHTML);
		event.setData('text/html', svgExportElem.outerHTML);
		event.setData(
			'image/png',
			new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to convert canvas to blob.'));
					}
				}, 'image/png');
			}),
		);
		if (text.length > 0) {
			event.setData('text/plain', text.join('\n'));
		}
		return true;
	}

	public override setEnabled(enabled: boolean) {
		const wasEnabled = this.isEnabled();
		super.setEnabled(enabled);

		if (wasEnabled === enabled) {
			return;
		}

		// Clear the selection
		this.selectionBox?.cancelSelection();
		this.onSelectionUpdated();

		this.handleOverlay.replaceChildren();
		this.selectionBox = null;

		this.shiftKeyPressed = false;
		this.snapToGrid = false;

		this.handleOverlay.style.display = enabled ? 'block' : 'none';

		if (enabled) {
			this.handleOverlay.tabIndex = 0;
			this.handleOverlay.setAttribute(
				'aria-label',
				this.editor.localization.selectionToolKeyboardShortcuts,
			);
		} else {
			this.handleOverlay.tabIndex = -1;
		}
	}

	// Get the object responsible for displaying this' selection.
	// @internal
	public getSelection(): Selection | null {
		return this.selectionBox;
	}

	/** @returns true if the selection is currently being created by the user. */
	public isSelecting() {
		return !!this.selectionBuilder;
	}

	public getSelectedObjects(): AbstractComponent[] {
		return this.selectionBox?.getSelectedObjects() ?? [];
	}

	// Select the given `objects`. Any non-selectable objects in `objects` are ignored.
	public setSelection(objects: AbstractComponent[]) {
		// Only select selectable objects.
		objects = objects.filter((obj) => obj.isSelectable());

		// Sort by z-index
		objects.sort((a, b) => a.getZIndex() - b.getZIndex());

		// Remove duplicates
		objects = objects.filter((current, idx) => {
			if (idx > 0) {
				return current !== objects[idx - 1];
			}

			return true;
		});

		let bbox: Rect2 | null = null;
		for (const object of objects) {
			if (bbox) {
				bbox = bbox.union(object.getBBox());
			} else {
				bbox = object.getBBox();
			}
		}

		this.clearSelectionNoUpdateEvent();
		if (bbox) {
			this.makeSelectionBox(objects);
		}
		this.onSelectionUpdated();
	}

	// Equivalent to .clearSelection, but does not dispatch an update event
	private clearSelectionNoUpdateEvent() {
		this.handleOverlay.replaceChildren();
		this.prevSelectionBox = this.selectionBox;
		this.selectionBox = null;
	}

	public clearSelection() {
		this.clearSelectionNoUpdateEvent();
		this.onSelectionUpdated();
	}
}
