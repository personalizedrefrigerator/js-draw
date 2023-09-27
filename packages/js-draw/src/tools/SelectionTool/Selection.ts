/**
 * @internal
 * @packageDocumentation
 */

import SerializableCommand from '../../commands/SerializableCommand';
import Editor from '../../Editor';
import { Mat33, Rect2, Point2, Vec2, Mat33Array } from '@js-draw/math';
import Pointer from '../../Pointer';
import SelectionHandle, { HandleAction, handleSize } from './SelectionHandle';
import { cssPrefix } from './SelectionTool';
import AbstractComponent from '../../components/AbstractComponent';
import { EditorLocalization } from '../../localization';
import Viewport from '../../Viewport';
import Erase from '../../commands/Erase';
import Duplicate from '../../commands/Duplicate';
import Command from '../../commands/Command';
import { DragTransformer, ResizeTransformer, RotateTransformer } from './TransformMode';
import { ResizeMode } from './types';
import EditorImage from '../../image/EditorImage';

const updateChunkSize = 100;
const maxPreviewElemCount = 500;

// @internal
export default class Selection {
	private handles: SelectionHandle[];
	private originalRegion: Rect2;

	// The last-computed bounding box of selected content
	// @see getTightBoundingBox
	private selectionTightBoundingBox: Rect2|null = null;

	private transformers;
	private transform: Mat33 = Mat33.identity;

	private selectedElems: AbstractComponent[] = [];

	private container: HTMLElement;
	private backgroundElem: HTMLElement;

	private hasParent: boolean = true;

	public constructor(startPoint: Point2, private editor: Editor) {
		this.originalRegion = new Rect2(startPoint.x, startPoint.y, 0, 0);
		this.transformers = {
			drag: new DragTransformer(editor, this),
			resize: new ResizeTransformer(editor, this),
			rotate: new RotateTransformer(editor, this),
		};

		this.container = document.createElement('div');
		this.backgroundElem = document.createElement('div');
		this.backgroundElem.classList.add(`${cssPrefix}selection-background`);
		this.container.appendChild(this.backgroundElem);

		const resizeHorizontalHandle = new SelectionHandle(
			{
				action: HandleAction.ResizeX,
				side: Vec2.of(1, 0.5),
			},
			this,
			this.editor.viewport,
			(startPoint) => this.transformers.resize.onDragStart(startPoint, ResizeMode.HorizontalOnly),
			(currentPoint) => this.transformers.resize.onDragUpdate(currentPoint),
			() => this.transformers.resize.onDragEnd(),
		);

		const resizeVerticalHandle = new SelectionHandle(
			{
				action: HandleAction.ResizeY,
				side: Vec2.of(0.5, 1),
			},
			this,
			this.editor.viewport,
			(startPoint) => this.transformers.resize.onDragStart(startPoint, ResizeMode.VerticalOnly),
			(currentPoint) => this.transformers.resize.onDragUpdate(currentPoint),
			() => this.transformers.resize.onDragEnd(),
		);

		const resizeBothHandle = new SelectionHandle(
			{
				action: HandleAction.ResizeXY,
				side: Vec2.of(1, 1),
			},
			this,
			this.editor.viewport,
			(startPoint) => this.transformers.resize.onDragStart(startPoint, ResizeMode.Both),
			(currentPoint) => this.transformers.resize.onDragUpdate(currentPoint),
			() => this.transformers.resize.onDragEnd(),
		);

		const rotationHandle = new SelectionHandle(
			{
				action: HandleAction.Rotate,
				side: Vec2.of(0.5, 0),
				icon: this.editor.icons.makeRotateIcon(),
			},
			this,
			this.editor.viewport,
			(startPoint) => this.transformers.rotate.onDragStart(startPoint),
			(currentPoint) => this.transformers.rotate.onDragUpdate(currentPoint),
			() => this.transformers.rotate.onDragEnd(),
		);

		this.handles = [
			resizeBothHandle,
			resizeHorizontalHandle,
			resizeVerticalHandle,
			rotationHandle,
		];

		for (const handle of this.handles) {
			handle.addTo(this.backgroundElem);
		}
	}

	// @internal Intended for unit tests
	public getBackgroundElem(): HTMLElement {
		return this.backgroundElem;
	}

	public getTransform(): Mat33 {
		return this.transform;
	}

	public get preTransformRegion(): Rect2 {
		return this.originalRegion;
	}

	public get region(): Rect2 {
		// TODO: This currently assumes that the region rotates about its center.
		// This may not be true.
		const rotationMatrix = Mat33.zRotation(this.regionRotation, this.originalRegion.center);
		const scaleAndTranslateMat = this.transform.rightMul(rotationMatrix.inverse());
		return this.originalRegion.transformedBoundingBox(scaleAndTranslateMat);
	}

	/**
	 * Computes and returns the bounding box of the selection without
	 * any additional padding. Computes directly from the elements that are selected.
	 * @internal
	 */
	public computeTightBoundingBox() {
		const bbox = this.selectedElems.reduce((
			accumulator: Rect2|null, elem: AbstractComponent
		): Rect2 => {
			return (accumulator ?? elem.getBBox()).union(elem.getBBox());
		}, null);

		return bbox ?? Rect2.empty;
	}

	public get regionRotation(): number {
		return this.transform.transformVec3(Vec2.unitX).angle();
	}

	public get preTransformedScreenRegion(): Rect2 {
		const toScreen = (vec: Point2) => this.editor.viewport.canvasToScreen(vec);
		return Rect2.fromCorners(
			toScreen(this.preTransformRegion.topLeft),
			toScreen(this.preTransformRegion.bottomRight)
		);
	}

	public get preTransformedScreenRegionRotation(): number {
		return this.editor.viewport.getRotationAngle();
	}

	public get screenRegion(): Rect2 {
		const toScreen = this.editor.viewport.canvasToScreenTransform;
		const scaleFactor = this.editor.viewport.getScaleFactor();

		const screenCenter = toScreen.transformVec2(this.region.center);

		return new Rect2(
			screenCenter.x, screenCenter.y, scaleFactor * this.region.width, scaleFactor * this.region.height
		).translatedBy(this.region.size.times(-scaleFactor/2));
	}

	public get screenRegionRotation(): number {
		return this.regionRotation + this.editor.viewport.getRotationAngle();
	}

	// Applies, previews, but doesn't finalize the given transformation.
	public setTransform(transform: Mat33, preview: boolean = true) {
		this.transform = transform;

		if (preview && this.hasParent) {
			this.scrollTo();
			this.previewTransformCmds();
		}
	}

	// Applies the current transformation to the selection
	public async finalizeTransform() {
		const fullTransform = this.transform;
		const selectedElems = this.selectedElems;

		// Reset for the next drag
		this.originalRegion = this.originalRegion.transformedBoundingBox(this.transform);
		this.transform = Mat33.identity;

		// Make the commands undo-able, but only if the transform is non-empty.
		if (!fullTransform.eq(Mat33.identity)) {
			await this.editor.dispatch(new Selection.ApplyTransformationCommand(
				this, selectedElems, fullTransform
			));
		}

		// Clear renderings of any in-progress transformations
		const wetInkRenderer = this.editor.display.getWetInkRenderer();
		wetInkRenderer.clear();
	}

	static {
		SerializableCommand.register('selection-tool-transform', (json: any, _editor) => {
			// The selection box is lost when serializing/deserializing. No need to store box rotation
			const fullTransform: Mat33 = new Mat33(...(json.transform as Mat33Array));
			const elemIds: string[] = (json.elems as any[] ?? []);

			return new this.ApplyTransformationCommand(null, elemIds, fullTransform);
		});
	}

	private static ApplyTransformationCommand = class extends SerializableCommand {
		private transformCommands: Command[];
		private selectedElemIds: string[];

		public constructor(
			private selection: Selection|null,

			// If a `string[]`, selectedElems is a list of element IDs.
			selectedElems: AbstractComponent[]|string[],

			// Full transformation used to transform elements.
			private fullTransform: Mat33,
		) {
			super('selection-tool-transform');

			const isIDList = (arr: AbstractComponent[]|string[]): arr is string[] => {
				return typeof arr[0] === 'string';
			};

			// If a list of element IDs,
			if (isIDList(selectedElems)) {
				this.selectedElemIds = selectedElems as string[];
			} else {
				this.selectedElemIds = (selectedElems as AbstractComponent[]).map(elem => elem.getId());
				this.transformCommands = selectedElems.map(elem => {
					return elem.transformBy(this.fullTransform);
				});
			}
		}

		private resolveToElems(editor: Editor) {
			if (this.transformCommands) {
				return;
			}

			this.transformCommands = this.selectedElemIds.map(id => {
				const elem = editor.image.lookupElement(id);

				if (!elem) {
					throw new Error(`Unable to find element with ID, ${id}.`);
				}

				return elem.transformBy(this.fullTransform);
			});
		}

		public async apply(editor: Editor) {
			this.resolveToElems(editor);

			this.selection?.setTransform(this.fullTransform, false);
			this.selection?.updateUI();
			await editor.asyncApplyCommands(this.transformCommands, updateChunkSize);
			this.selection?.setTransform(Mat33.identity, false);
			this.selection?.recomputeRegion();
			this.selection?.updateUI();
		}

		public async unapply(editor: Editor) {
			this.resolveToElems(editor);

			this.selection?.setTransform(this.fullTransform.inverse(), false);
			this.selection?.updateUI();

			await editor.asyncUnapplyCommands(this.transformCommands, updateChunkSize, true);
			this.selection?.setTransform(Mat33.identity, false);
			this.selection?.recomputeRegion();
			this.selection?.updateUI();
		}

		protected serializeToJSON() {
			return {
				elems: this.selectedElemIds,
				transform: this.fullTransform.toArray(),
			};
		}

		public description(_editor: Editor, localizationTable: EditorLocalization) {
			return localizationTable.transformedElements(this.selectedElemIds.length);
		}
	};

	// Preview the effects of the current transformation on the selection
	private previewTransformCmds() {
		// Don't render what we're moving if it's likely to be slow.
		if (this.selectedElems.length > maxPreviewElemCount) {
			this.updateUI();
			return;
		}

		const wetInkRenderer = this.editor.display.getWetInkRenderer();
		wetInkRenderer.clear();
		wetInkRenderer.pushTransform(this.transform);

		const viewportVisibleRect = this.editor.viewport.visibleRect;
		const visibleRect = viewportVisibleRect.transformedBoundingBox(this.transform.inverse());

		for (const elem of this.selectedElems) {
			elem.render(wetInkRenderer, visibleRect);
		}

		wetInkRenderer.popTransform();

		this.updateUI();
	}

	// Find the objects corresponding to this in the document,
	// select them.
	// Returns false iff nothing was selected.
	public resolveToObjects(): boolean {
		let singleItemSelectionMode = false;
		this.transform = Mat33.identity;

		// Grow the rectangle, if necessary
		if (this.region.w === 0 || this.region.h === 0) {
			const padding = this.editor.viewport.visibleRect.maxDimension / 200;
			this.originalRegion = Rect2.bboxOf(this.region.corners, padding);

			// Only select one item if the rectangle was very small.
			singleItemSelectionMode = true;
		}

		this.selectedElems = this.editor.image.getElementsIntersectingRegion(this.region).filter(elem => {
			return elem.intersectsRect(this.region) && elem.isSelectable();
		});

		if (singleItemSelectionMode && this.selectedElems.length > 0) {
			this.selectedElems = [ this.selectedElems[this.selectedElems.length - 1] ];
		}

		// Find the bounding box of all selected elements.
		if (!this.recomputeRegion()) {
			return false;
		}
		this.updateUI();

		return true;
	}

	// Recompute this' region from the selected elements.
	// Returns false if the selection is empty.
	public recomputeRegion(): boolean {
		const newRegion = this.computeTightBoundingBox();
		this.selectionTightBoundingBox = newRegion;

		if (!newRegion) {
			this.cancelSelection();
			return false;
		}

		this.originalRegion = newRegion;
		this.padRegion();

		return true;
	}

	// Applies padding to the current region if it is too small.
	// @internal
	public padRegion() {
		const sourceRegion = this.selectionTightBoundingBox ?? this.originalRegion;

		const minSize = this.getMinCanvasSize();
		if (sourceRegion.w < minSize || sourceRegion.h < minSize) {
			// Add padding
			const padding = minSize / 2;
			this.originalRegion = Rect2.bboxOf(
				sourceRegion.corners, padding
			);

			this.updateUI();
		}
	}

	public getMinCanvasSize(): number {
		const canvasHandleSize = handleSize / this.editor.viewport.getScaleFactor();
		return canvasHandleSize * 2;
	}

	public getSelectedItemCount() {
		return this.selectedElems.length;
	}

	// @internal
	public updateUI() {
		// Don't update old selections.
		if (!this.hasParent) {
			return;
		}

		// marginLeft, marginTop: Display relative to the top left of the selection overlay.
		// left, top don't work for this.
		this.backgroundElem.style.marginLeft = `${this.screenRegion.topLeft.x}px`;
		this.backgroundElem.style.marginTop = `${this.screenRegion.topLeft.y}px`;

		this.backgroundElem.style.width = `${this.screenRegion.width}px`;
		this.backgroundElem.style.height = `${this.screenRegion.height}px`;

		const rotationDeg = this.screenRegionRotation * 180 / Math.PI;
		this.backgroundElem.style.transform = `rotate(${rotationDeg}deg)`;
		this.backgroundElem.style.transformOrigin = 'center';

		// If closer to perpendicular, apply different CSS
		const perpendicularClassName = `${cssPrefix}rotated-near-perpendicular`;
		if (Math.abs(Math.sin(this.screenRegionRotation)) > 0.5) {
			this.container.classList.add(perpendicularClassName);
		} else {
			this.container.classList.remove(perpendicularClassName);
		}

		for (const handle of this.handles) {
			handle.updatePosition();
		}
	}

	// Maps IDs to whether we removed the component from the image
	private removedFromImage: Record<string, boolean> = {};

	// Add/remove the contents of this' seleciton from the editor.
	// Used to prevent previewed content from looking like duplicate content
	// while dragging.
	//
	// Does nothing if a large number of elements are selected (and so modifying
	// the editor image is likely to be slow.)
	//
	// If removed from the image, selected elements are drawn as wet ink.
	private addRemoveSelectionFromImage(inImage: boolean) {
		// Don't hide elements if doing so will be slow.
		if (!inImage && this.selectedElems.length > maxPreviewElemCount) {
			return;
		}

		for (const elem of this.selectedElems) {
			const parent = this.editor.image.findParent(elem);

			if (!inImage && parent) {
				this.removedFromImage[elem.getId()] = true;
				parent.remove();
			}
			// If we're making things visible and the selected object wasn't previously
			// visible,
			else if (!parent && this.removedFromImage[elem.getId()]) {
				EditorImage.addElement(elem).apply(this.editor);

				this.removedFromImage[elem.getId()] = false;
				delete this.removedFromImage[elem.getId()];
			}
		}

		// Don't await queueRerender. If we're running in a test, the re-render might never
		// happen.
		this.editor.queueRerender().then(() => {
			if (!inImage) {
				this.previewTransformCmds();
			}
		});
	}

	private removeDeletedElemsFromSelection() {
		// Remove any deleted elements from the selection.
		this.selectedElems = this.selectedElems.filter(elem => {
			const hasParent = !!this.editor.image.findParent(elem);

			// If we removed the element and haven't added it back yet, don't remove it
			// from the selection.
			const weRemoved = this.removedFromImage[elem.getId()];
			return hasParent || weRemoved;
		});
	}

	private targetHandle: SelectionHandle|null = null;
	private backgroundDragging: boolean = false;
	public onDragStart(pointer: Pointer): boolean {
		// Clear the HTML selection (prevent HTML drag and drop being triggered by this drag)
		document.getSelection()?.removeAllRanges();

		this.targetHandle = null;

		let result = false;

		for (const handle of this.handles) {
			if (handle.containsPoint(pointer.canvasPos)) {
				this.targetHandle = handle;
				result = true;
			}
		}

		this.backgroundDragging = false;
		if (this.region.containsPoint(pointer.canvasPos)) {
			this.backgroundDragging = true;
			result = true;
		}

		if (result) {
			this.removeDeletedElemsFromSelection();
			this.addRemoveSelectionFromImage(false);
		}

		if (this.targetHandle) {
			this.targetHandle.handleDragStart(pointer);
		}

		if (this.backgroundDragging) {
			this.transformers.drag.onDragStart(pointer.canvasPos);
		}

		return result;
	}

	public onDragUpdate(pointer: Pointer) {
		if (this.backgroundDragging) {
			this.transformers.drag.onDragUpdate(pointer.canvasPos);
		}

		if (this.targetHandle) {
			this.targetHandle.handleDragUpdate(pointer);
		}
	}

	public onDragEnd() {
		if (this.backgroundDragging) {
			this.transformers.drag.onDragEnd();
		}
		else if (this.targetHandle) {
			this.targetHandle.handleDragEnd();
		}

		this.addRemoveSelectionFromImage(true);

		this.backgroundDragging = false;
		this.targetHandle = null;
		this.updateUI();
	}

	public onDragCancel() {
		this.backgroundDragging = false;
		this.targetHandle = null;
		this.setTransform(Mat33.identity);

		this.addRemoveSelectionFromImage(true);
	}

	// Scroll the viewport to this. Does not zoom
	public async scrollTo() {
		if (this.selectedElems.length === 0) {
			return;
		}

		const screenRect = new Rect2(0, 0, this.editor.display.width, this.editor.display.height);
		if (!screenRect.containsPoint(this.screenRegion.center)) {
			const closestPoint = screenRect.getClosestPointOnBoundaryTo(this.screenRegion.center);
			const screenDelta = this.screenRegion.center.minus(closestPoint);
			const delta = this.editor.viewport.screenToCanvasTransform.transformVec3(screenDelta);
			await this.editor.dispatchNoAnnounce(
				Viewport.transformBy(Mat33.translation(delta.times(-1))), false
			);

			// Re-renders clear wet ink, so we need to re-draw the preview
			// after the full re-render.
			await this.editor.queueRerender();
			this.previewTransformCmds();
		}
	}

	public deleteSelectedObjects(): Command {
		if (this.backgroundDragging || this.targetHandle) {
			this.onDragEnd();
		}

		return new Erase(this.selectedElems);
	}

	private selectionDuplicatedAnimationTimeout: ReturnType<typeof setTimeout>|null = null;
	private runSelectionDuplicatedAnimation() {
		if (this.selectionDuplicatedAnimationTimeout) {
			clearTimeout(this.selectionDuplicatedAnimationTimeout);
		}

		const animationDuration = 400; // ms
		this.backgroundElem.style.animation = `${animationDuration}ms ease selection-duplicated-animation`;

		this.selectionDuplicatedAnimationTimeout = setTimeout(() => {
			this.backgroundElem.style.animation = '';
			this.selectionDuplicatedAnimationTimeout = null;
		}, animationDuration);
	}

	public async duplicateSelectedObjects(): Promise<Command> {
		const wasTransforming = this.backgroundDragging || this.targetHandle;
		let tmpApplyCommand: Command|null = null;

		if (!wasTransforming) {
			this.runSelectionDuplicatedAnimation();
		}

		if (wasTransforming) {
			// Don't update the selection's focus when redoing/undoing
			const selectionToUpdate: Selection|null = null;
			tmpApplyCommand = new Selection.ApplyTransformationCommand(
				selectionToUpdate, this.selectedElems, this.transform
			);

			// Transform to ensure that the duplicates are in the correct location
			await tmpApplyCommand.apply(this.editor);

			// Show items again
			this.addRemoveSelectionFromImage(true);
		}

		const duplicateCommand = new Duplicate(this.selectedElems);

		if (wasTransforming) {
			// Move the selected objects back to the correct location.
			await tmpApplyCommand?.unapply(this.editor);
			this.addRemoveSelectionFromImage(false);

			this.previewTransformCmds();
			this.updateUI();
		}

		return duplicateCommand;
	}

	public addTo(elem: HTMLElement) {
		if (this.container.parentElement) {
			this.container.remove();
		}

		elem.appendChild(this.container);
		this.hasParent = true;
	}

	public setToPoint(point: Point2) {
		this.originalRegion = this.originalRegion.grownToPoint(point);
		this.selectionTightBoundingBox = null;

		this.updateUI();
	}

	public cancelSelection() {
		if (this.container.parentElement) {
			this.container.remove();
		}
		this.originalRegion = Rect2.empty;
		this.selectionTightBoundingBox = null;
		this.hasParent = false;
	}

	public setSelectedObjects(objects: AbstractComponent[], bbox: Rect2) {
		this.addRemoveSelectionFromImage(true);
		this.originalRegion = bbox;
		this.selectionTightBoundingBox = bbox;
		this.selectedElems = objects.filter(object => object.isSelectable());
		this.padRegion();
		this.updateUI();
	}

	public getSelectedObjects(): AbstractComponent[] {
		return [...this.selectedElems];
	}
}

