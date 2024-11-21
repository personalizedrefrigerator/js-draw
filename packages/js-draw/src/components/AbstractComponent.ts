import SerializableCommand from '../commands/SerializableCommand';
import Editor from '../Editor';
import EditorImage from '../image/EditorImage';
import { LineSegment2, Mat33, Mat33Array, Path, Rect2 } from '@js-draw/math';
import { EditorLocalization } from '../localization';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import { ImageComponentLocalization } from './localization';
import UnresolvedSerializableCommand from '../commands/UnresolvedCommand';
import Viewport from '../Viewport';

export type LoadSaveData = string[] | Record<symbol|string, string | number>;
export type LoadSaveDataTable = Record<string, Array<LoadSaveData>>;
export type DeserializeCallback = (data: string) => AbstractComponent;
type ComponentId = string;

export enum ComponentSizingMode {
	/** The default. The compnent gets its size from its bounding box. */
	BoundingBox,

	/** Causes the component to fill the entire visible region of the screen */
	FillScreen,

	/**
	 * Displays the component anywhere (arbitrary location) on the
	 * canvas. (Ignoring the bounding box).
	 *
	 * These components may be ignored unless a full render is done.
	 *
	 * Intended for compnents that need to be rendered on a full export,
	 * but won't be visible to the user.
	 *
	 * For example, a metadata component.
	 */
	Anywhere,
}

/**
 * A base class for everything that can be added to an {@link EditorImage}.
 */
export default abstract class AbstractComponent {
	// The timestamp (milliseconds) at which the component was
	// last changed (i.e. created/translated).
	// @deprecated
	protected lastChangedTime: number;

	/**
	 * The bounding box of this component.
	 * {@link getBBox}, by default, returns `contentBBox`.
	 * This must be set by components.
	 *
	 * If this changes, {@link EditorImage.queueRerenderOf} should be called for
	 * this object (provided that this object has been added to the editor.)
	 *
	 * **Note**: This value is ignored if {@link getSizingMode} returns `FillScreen`
	 * or `FillImage`.
	 */
	protected abstract contentBBox: Rect2;

	private zIndex: number;
	private id: string;

	// Topmost z-index
	// TODO: Should be a property of the EditorImage.
	private static zIndexCounter: number = 0;

	protected constructor(
		// A unique identifier for the type of component
		private readonly componentKind: string,
		initialZIndex?: number,
	) {
		this.lastChangedTime = new Date().getTime();

		if (initialZIndex !== undefined) {
			this.zIndex = initialZIndex;
		} else {
			this.zIndex = AbstractComponent.zIndexCounter++;
		}

		// Create a unique ID.
		this.id = `${new Date().getTime()}-${Math.random()}`;

		if (AbstractComponent.deserializationCallbacks[componentKind] === undefined) {
			throw new Error(
				`Component ${componentKind} has not been registered using AbstractComponent.registerComponent`,
			);
		}
	}

	// Returns a unique ID for this element.
	// @see { @link EditorImage.lookupElement }
	public getId() {
		return this.id;
	}

	private static deserializationCallbacks: Record<ComponentId, DeserializeCallback | null> = {};

	// Store the deserialization callback (or lack of it) for [componentKind].
	// If components are registered multiple times (as may be done in automated tests),
	// the most recent deserialization callback is used.
	public static registerComponent(componentKind: string, deserialize: DeserializeCallback | null) {
		this.deserializationCallbacks[componentKind] = deserialize ?? null;
	}

	// Stores data attached by a loader.
	private loadSaveData: LoadSaveDataTable = {};

	/**
	 * Attach data that can be used while exporting the component (e.g. to SVG).
	 *
	 * This is intended for use by an {@link ImageLoader}.
	 */
	public attachLoadSaveData(key: string, data: LoadSaveData) {
		if (!this.loadSaveData[key]) {
			this.loadSaveData[key] = [];
		}
		this.loadSaveData[key].push(data);
	}

	/** See {@link attachLoadSaveData} */
	public getLoadSaveData(): LoadSaveDataTable {
		return this.loadSaveData;
	}

	public getZIndex(): number {
		return this.zIndex;
	}

	/**
	 * @returns the bounding box of this. This can be a slight overestimate if doing so
	 * 			significantly improves performance.
	 */
	public getBBox(): Rect2 {
		return this.contentBBox;
	}

	/**
	 * @returns the bounding box of this. Unlike `getBBox`, this should **not** be a rough estimate.
	 */
	public getExactBBox() {
		return this.getBBox();
	}

	/**
	 * Returns information about how this component should be displayed
	 * (e.g. fill the screen or get its size from {@link getBBox}).
	 *
	 * {@link EditorImage.queueRerenderOf} must be called to apply changes to
	 * the output of this method if this component has already been added to an
	 * {@link EditorImage}.
	 */
	public getSizingMode(): ComponentSizingMode {
		return ComponentSizingMode.BoundingBox;
	}

	/**
	 * **Optimization**
	 *
	 * Should return `true` if this component covers the entire `visibleRect`
	 * and would prevent anything below this component from being visible.
	 *
	 * Should return `false` otherwise.
	 */
	public occludesEverythingBelowWhenRenderedInRect(_visibleRect: Rect2) {
		return false;
	}

	/** Called when this component is added to the given image. */
	public onAddToImage(_image: EditorImage): void {}
	public onRemoveFromImage(): void {}

	/**
	 * Renders this component onto the given `canvas`.
	 *
	 * If `visibleRect` is given, it should be the region of `canvas` that is visible --
	 * rendering anything outside of `visibleRect` should have no visible effect on the
	 * resultant image.
	 *
	 * For optimal performance, implementers should call `canvas.startObject` and `canvas.endObject`
	 * before and after rendering.
	 */
	public abstract render(canvas: AbstractRenderer, visibleRect?: Rect2): void;

	/** @return true if `lineSegment` intersects this component. */
	public abstract intersects(lineSegment: LineSegment2): boolean;

	/**
	 * @returns true if this component intersects `rect` -- it is entirely contained
	 *  within the rectangle or one of the rectangle's edges intersects this component.
	 *
	 * The default implementation assumes that `this.getExactBBox()` returns a tight bounding box
	 * -- that any horiziontal/vertical line that intersects this' boounding box also
	 * intersects a point in this component. If this is not the case, components must override
	 * this function.
	 */
	public intersectsRect(rect: Rect2): boolean {
		// If this component intersects the given rectangle,
		// it is either contained entirely within rect or intersects one of rect's edges.

		// If contained within,
		if (rect.containsRect(this.getExactBBox())) {
			return true;
		}

		// Otherwise check if it intersects one of the rectangle's edges.
		const testLines = rect.getEdges();
		return testLines.some((edge) => this.intersects(edge));
	}

	// @returns true iff this component can be selected (e.g. by the selection tool.)
	public isSelectable(): boolean {
		return true;
	}

	// @returns true iff this component should be added to the background, rather than the
	// foreground of the image.
	public isBackground(): boolean {
		return false;
	}

	// @returns an approximation of the proportional time it takes to render this component.
	// This is intended to be a rough estimate, but, for example, a stroke with two points sould have
	// a renderingWeight approximately twice that of a stroke with one point.
	public getProportionalRenderingTime(): number {
		return 1;
	}

	// Private helper for transformBy: Apply the given transformation to all points of this.
	protected abstract applyTransformation(affineTransfm: Mat33): void;

	/**
	 * Returns a command that, when applied, transforms this by [affineTransfm] and
	 * updates the editor.
	 *
	 * The transformed component is also moved to the top (use
	 * {@link AbstractComponent#setZIndexAndTransformBy} to avoid this behavior).
	 */
	public transformBy(affineTransfm: Mat33): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(affineTransfm, this.getId(), this);
	}

	// Returns a command that updates this component's z-index.
	public setZIndex(newZIndex: number): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(
			Mat33.identity,
			this.getId(),
			this,
			newZIndex,
		);
	}

	/**
	 * Combines {@link transformBy} and {@link setZIndex} into a single command.
	 *
	 * @param newZIndex - The z-index this component should have after applying this command.
	 * @param originalZIndex - @internal The z-index the component should revert to after unapplying
	 *                         this command.
	 */
	public setZIndexAndTransformBy(
		affineTransfm: Mat33,
		newZIndex: number,
		originalZIndex?: number,
	): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(
			affineTransfm,
			this.getId(),
			this,
			newZIndex,
			originalZIndex,
		);
	}

	private static transformElementCommandId = 'transform-element';

	private static TransformElementCommand = class extends UnresolvedSerializableCommand {
		private targetZIndex: number;

		// Construct a new TransformElementCommand. `component`, while optional, should
		// be provided if available. If not provided, it will be fetched from the editor's
		// document when the command is applied.
		public constructor(
			private affineTransfm: Mat33,
			componentID: string,
			component?: AbstractComponent,
			targetZIndex?: number,
			private origZIndex?: number,
		) {
			super(AbstractComponent.transformElementCommandId, componentID, component);
			this.targetZIndex = targetZIndex ?? AbstractComponent.zIndexCounter++;

			// Ensure that we keep drawing on top even after changing the z-index.
			if (this.targetZIndex >= AbstractComponent.zIndexCounter) {
				AbstractComponent.zIndexCounter = this.targetZIndex + 1;
			}

			if (component && origZIndex === undefined) {
				this.origZIndex = component.getZIndex();
			}
		}

		protected override resolveComponent(image: EditorImage): void {
			if (this.component) {
				return;
			}

			super.resolveComponent(image);
			this.origZIndex ??= this.component!.getZIndex();
		}

		private updateTransform(editor: Editor, newTransfm: Mat33, targetZIndex: number) {
			if (!this.component) {
				throw new Error('this.component is undefined or null!');
			}

			// Any parent should have only one direct child.
			const parent = editor.image.findParent(this.component);
			let hadParent = false;
			if (parent) {
				parent.remove();
				hadParent = true;
			}

			this.component.applyTransformation(newTransfm);
			this.component.zIndex = targetZIndex;
			this.component.lastChangedTime = new Date().getTime();

			// Ensure that new components are automatically drawn above the current component.
			if (targetZIndex >= AbstractComponent.zIndexCounter) {
				AbstractComponent.zIndexCounter = targetZIndex + 1;
			}

			// Add the element back to the document.
			if (hadParent) {
				EditorImage.addElement(this.component).apply(editor);
			}
		}

		public apply(editor: Editor) {
			this.resolveComponent(editor.image);

			this.updateTransform(editor, this.affineTransfm, this.targetZIndex);
			editor.queueRerender();
		}

		public unapply(editor: Editor) {
			this.resolveComponent(editor.image);

			this.updateTransform(editor, this.affineTransfm.inverse(), this.origZIndex!);
			editor.queueRerender();
		}

		public description(_editor: Editor, localizationTable: EditorLocalization) {
			return localizationTable.transformedElements(1);
		}

		static {
			SerializableCommand.register(
				AbstractComponent.transformElementCommandId,
				(json: any, editor: Editor) => {
					const elem = editor.image.lookupElement(json.id) ?? undefined;
					const transform = new Mat33(...(json.transfm as Mat33Array));
					const targetZIndex = json.targetZIndex;
					const origZIndex = json.origZIndex ?? undefined;

					return new AbstractComponent.TransformElementCommand(
						transform,
						json.id,
						elem,
						targetZIndex,
						origZIndex,
					);
				},
			);
		}

		protected serializeToJSON() {
			return {
				id: this.componentID,
				transfm: this.affineTransfm.toArray(),
				targetZIndex: this.targetZIndex,
				origZIndex: this.origZIndex,
			};
		}
	};

	/**
	 * @return a description that could be read by a screen reader
	 *     (e.g. when adding/erasing the component)
	 */
	public abstract description(localizationTable: ImageComponentLocalization): string;

	// Component-specific implementation of {@link clone}.
	protected abstract createClone(): AbstractComponent;

	// Returns a copy of this component.
	public clone() {
		const clone = this.createClone();

		for (const attachmentKey in this.loadSaveData) {
			for (const val of this.loadSaveData[attachmentKey]) {
				clone.attachLoadSaveData(attachmentKey, val);
			}
		}

		return clone;
	}

	/**
	 * **Optional method**: Divides this component into sections roughly along the given path,
	 * removing parts that are roughly within `shape`.
	 *
	 * **Notes**:
	 * - A default implementation may be provided for this method in the future. Until then,
	 *   this method is `undefined` if unsupported.
	 *
	 * `viewport` should be provided to determine how newly-added points should be rounded.
	 */
	public withRegionErased?(shape: Path, viewport: Viewport): AbstractComponent[];

	// Return null iff this object cannot be safely serialized/deserialized.
	protected abstract serializeToJSON(): any[] | Record<string, any> | number | string | null;

	// Convert the component to an object that can be passed to
	// `JSON.stringify`.
	//
	// Do not rely on the output of this function to take a particular form —
	// this function's output can change form without a major version increase.
	public serialize() {
		const data = this.serializeToJSON();

		if (data === null) {
			throw new Error(`${this} cannot be serialized.`);
		}

		return {
			name: this.componentKind,
			zIndex: this.zIndex,
			id: this.id,
			loadSaveData: this.loadSaveData,
			data,
		};
	}

	// Returns true if `data` is not deserializable. May return false even if [data]
	// is not deserializable.
	private static isNotDeserializable(json: any | string) {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (typeof json !== 'object') {
			return true;
		}

		if (!this.deserializationCallbacks[json?.name]) {
			return true;
		}

		if (!json.data) {
			return true;
		}

		return false;
	}

	// Convert a string or an object produced by `JSON.parse` into an `AbstractComponent`.
	public static deserialize(json: string | any): AbstractComponent {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (AbstractComponent.isNotDeserializable(json)) {
			throw new Error(`Element with data ${json} cannot be deserialized.`);
		}

		const instance = this.deserializationCallbacks[json.name]!(json.data);
		instance.id = json.id;

		if (isFinite(json.zIndex)) {
			instance.zIndex = json.zIndex;

			// Ensure that new components will be added on top.
			AbstractComponent.zIndexCounter = Math.max(
				AbstractComponent.zIndexCounter,
				instance.zIndex + 1,
			);
		}

		// TODO: What should we do with json.loadSaveData?
		//       If we attach it to [instance], we create a potential security risk — loadSaveData
		//       is often used to store unrecognised attributes so they can be preserved on output.
		//       ...but what if we're deserializing data sent across the network?

		return instance;
	}
}
