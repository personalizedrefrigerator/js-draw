import SerializableCommand from "../../commands/SerializableCommand";
import Editor from "../../Editor";
import { Mat33, Rect2 } from "../../math/lib";
import { Point2, Vec2 } from "../../math/Vec2";
import Pointer from '../../Pointer';
import SelectionHandle, { HandleShape } from "./SelectionHandle";
import { cssPrefix } from "./SelectionTool";
import AbstractComponent from '../../components/AbstractComponent';
import { Mat33Array } from "../../math/Mat33";
import { EditorLocalization } from "../../localization";

enum ResizeMode {
	Both,
	HorizontalOnly,
	VerticalOnly,
}

enum TransformMode {
	Snap,
	NoSnap,
}

export default class Selection {
	private handles: SelectionHandle[];
	private rect: Rect2;
	private previewRect: Rect2|null;

	private transformOrigin: Point2;
	private transformMode: TransformMode = TransformMode.Snap;
	private transform: Mat33 = Mat33.identity;
	private transformCommands: SerializableCommand[] = [];

	private selectedElements: AbstractComponent[] = [];

	private container: HTMLElement;
	private backgroundElem: HTMLElement;

	public constructor(private readonly startPoint: Point2, private editor: Editor) {
		this.rect = new Rect2(startPoint.x, startPoint.y, 0, 0);
		this.transformOrigin = this.rect.topLeft;

		this.container = document.createElement('div');
		this.backgroundElem = document.createElement('div');
		this.backgroundElem.classList.add(`${cssPrefix}selection-background`);
		this.backgroundElem.style.display = 'none';
		this.container.appendChild(this.backgroundElem);

		const resizeHorizontalHandle = new SelectionHandle(
			HandleShape.Square,
			Vec2.of(1, 0.5),
			this,
			(startPoint) => this.startResize(startPoint, ResizeMode.HorizontalOnly),
			(currentPoint) => this.updateResize(currentPoint),
			() => this.finalizeResize(),
		);

		const resizeVerticalHandle = new SelectionHandle(
			HandleShape.Square,
			Vec2.of(0.5, 1),
			this,
			(startPoint) => this.startResize(startPoint, ResizeMode.VerticalOnly),
			(currentPoint) => this.updateResize(currentPoint),
			() => this.finalizeResize(),
		);

		const resizeBothHandle = new SelectionHandle(
			HandleShape.Square,
			Vec2.of(1, 1),
			this,
			(startPoint) => this.startResize(startPoint, ResizeMode.Both),
			(currentPoint) => this.updateResize(currentPoint),
			() => this.finalizeResize(),
		)

		this.handles = [
			resizeBothHandle,
			resizeHorizontalHandle,
			resizeVerticalHandle,
		];

		for (const handle of this.handles) {
			handle.addTo(this.container);
		}
	}

	public addTo(container: HTMLElement) {
		container.appendChild(this.container);
	}

	public get region() {
		return this.previewRect ?? this.rect;
	}

	/**
	 * Preveiw `transform`'s effects. To dispatch the transform, call
	 * { @link finalizeTransform }.
	 */
	public setTransform(transform: Mat33) {
		for (const command of this.transformCommands) {
			command.unapply(this.editor);
		}
		this.transform = transform;

		const maxPreviewElems = 30;
		if (this.selectedElements.length < maxPreviewElems) {
			this.transformCommands = this.selectedElements.map(elem => {
				return elem.transformBy(this.transform);
			});
		} else {
			this.transformCommands = [];
		}

		this.previewRect = this.rect.transformedBoundingBox(this.transform);
		this.updateUI();
	}

	private finalizeTransform() {
		this.rect = this.previewRect!;
		this.previewRect = null;

		// Convert this.transformCommands into a full command.
		for (const command of this.transformCommands) {
			command.unapply(this.editor);
		}
		this.transformCommands = [];


		this.updateUI();
	}

	private updateUI() {
		// TODO: Update this.rect
		// TODO: Update background size.
		// TODO: Update handle positions.
	}

	/** Re-computes the visible box/position of the selection handles based on the selected elements. */
	public computeRegionFromSelection() {
		const newRegion = this.selectedElements.reduce((
			accumulator: Rect2|null, elem: AbstractComponent
		): Rect2 => {
			return (accumulator ?? elem.getBBox()).union(elem.getBBox());
		}, null);

		if (!newRegion) {
			this.clearSelection();
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

	private gestureStartPoint: Point2;
	private resizeMode: ResizeMode|null = null;
	private startResize(startPoint: Point2, mode: ResizeMode) {
		this.resizeMode = mode;
		this.gestureStartPoint = startPoint;
	}

	private updateResize(resizeHandlePos: Point2) {
		this.transform = Mat33.translation(
			this.editor.viewport.roundPoint(resizeHandlePos.minus(this.gestureStartPoint)),
		);
		this.previewTransform();
	}

	private finalizeResize() {
		this.finalizeTransform();
	}

	private dragging: boolean = false;
	private startDrag(pointerPos: Point2) {
		this.dragging = true;
		this.gestureStartPoint = pointerPos;
	}

	private updateDrag(pointerPos: Point2) {
		;
	}

	private finalizeDrag() {
		this.dragging = false;
	}

	private startRotate() {
		;
	}

	private updateRotate(pointerPos: Point2) {
		;
	}

	private finalizeRotate() {
		;
	}

	/** @returns `true` if the selected region can handle the pointer event. */
	public handlePointerDown(pointer: Pointer): boolean {
		for (const handle of this.handles) {
			if (handle.contains(pointer.screenPos)) {
				handle.handleDragStart(pointer);
				return true;
			}
		}

		if (this.rect.containsPoint(pointer.screenPos)) {
			this.startDrag(pointer.screenPos);
			return true;
		}

		return false;
	}

	public clearSelection() {
		// TODO: Reset this' background
		// TODO: Fire change event.
	}

	public setSelection(items: AbstractComponent[]) {
		// TODO: Set this.selectedItems to clone of items[].
		// TODO: Update this.rect.
		// TODO: Fire change event.
	}



	static {
		SerializableCommand.register('selection-tool-transform', (json: any, editor) => {
			// The selection box is lost when serializing/deserializing. No need to store box rotation
			const guiBoxRotation = 0;
			const fullTransform: Mat33 = new Mat33(...(json.transform as Mat33Array));
			const commands = (json.commands as any[]).map(data => SerializableCommand.deserialize(data, editor));

			return new this.ApplyTransformationCommand(null, commands, fullTransform, guiBoxRotation);
		});
	}

	// Applies a transformation to a Selection and its contents.
	private static ApplyTransformationCommand = class extends SerializableCommand {
		public constructor(
			private selection: Selection|null,
			private currentTransfmCommands: SerializableCommand[],
			private fullTransform: Mat33,
		) {
			super('selection-tool-transform');
		}

		public async apply(editor: Editor) {
			// Approximate the new selection
			if (this.selection) {
				this.selection.rect = this.selection.rect.transformedBoundingBox(this.fullTransform);
				this.selection.updateUI();
			}

			await editor.asyncApplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection?.computeRegionFromSelection();
			this.selection?.updateUI();
		}

		public async unapply(editor: Editor) {
			if (this.selection) {
				this.selection.rect = this.selection.rect.transformedBoundingBox(this.fullTransform.inverse());
				this.selection.updateUI();
			}

			await editor.asyncUnapplyCommands(this.currentTransfmCommands, updateChunkSize);
			this.selection?.computeRegionFromSelection();
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
}