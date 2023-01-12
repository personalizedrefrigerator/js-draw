import SerializableCommand from '../commands/SerializableCommand';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import LineSegment2 from '../math/LineSegment2';
import Mat33, { Mat33Array } from '../math/Mat33';
import Rect2 from '../math/Rect2';
import { EditorLocalization } from '../localization';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import { ImageComponentLocalization } from './localization';

export type LoadSaveData = (string[]|Record<symbol, string|number>);
export type LoadSaveDataTable = Record<string, Array<LoadSaveData>>;
export type DeserializeCallback = (data: string)=>AbstractComponent;
type ComponentId = string;

export default abstract class AbstractComponent {
	protected lastChangedTime: number;
	protected abstract contentBBox: Rect2;
	private zIndex: number;
	private id: string;

	// Topmost z-index
	private static zIndexCounter: number = 0;

	protected constructor(
		// A unique identifier for the type of component
		private readonly componentKind: string,
	) {
		this.lastChangedTime = (new Date()).getTime();
		this.zIndex = AbstractComponent.zIndexCounter++;

		// Create a unique ID.
		this.id = `${new Date().getTime()}-${Math.random()}`;

		if (AbstractComponent.deserializationCallbacks[componentKind] === undefined) {
			throw new Error(`Component ${componentKind} has not been registered using AbstractComponent.registerComponent`);
		}
	}

	// Returns a unique ID for this element.
	// @see { @link lib!EditorImage.lookupElement }
	public getId() {
		return this.id;
	}

	private static deserializationCallbacks: Record<ComponentId, DeserializeCallback|null> = {};

	// Store the deserialization callback (or lack of it) for [componentKind].
	// If components are registered multiple times (as may be done in automated tests),
	// the most recent deserialization callback is used.
	public static registerComponent(
		componentKind: string,
		deserialize: DeserializeCallback|null,
	) {
		this.deserializationCallbacks[componentKind] = deserialize ?? null;
	}

	// Get and manage data attached by a loader.
	private loadSaveData: LoadSaveDataTable = {};
	public attachLoadSaveData(key: string, data: LoadSaveData) {
		if (!this.loadSaveData[key]) {
			this.loadSaveData[key] = [];
		}
		this.loadSaveData[key].push(data);
	}
	public getLoadSaveData(): LoadSaveDataTable {
		return this.loadSaveData;
	}

	public getZIndex(): number {
		return this.zIndex;
	}

	public getBBox(): Rect2 {
		return this.contentBBox;
	}

	public abstract render(canvas: AbstractRenderer, visibleRect?: Rect2): void;
	public abstract intersects(lineSegment: LineSegment2): boolean;

	public intersectsRect(rect: Rect2): boolean {
		// If this component intersects rect,
		// it is either contained entirely within rect or intersects one of rect's edges.

		// If contained within,
		if (rect.containsRect(this.getBBox())) {
			return true;
		}

		// Calculated bounding boxes can be slightly larger than their actual contents' bounding box.
		// As such, test with more lines than just the rect's edges.
		const testLines = [];
		for (const subregion of rect.divideIntoGrid(2, 2)) {
			testLines.push(...subregion.getEdges());
		}

		return testLines.some(edge => this.intersects(edge));
	}

	// Return null iff this object cannot be safely serialized/deserialized.
	protected abstract serializeToJSON(): any[]|Record<string, any>|number|string|null;

	// Private helper for transformBy: Apply the given transformation to all points of this.
	protected abstract applyTransformation(affineTransfm: Mat33): void;

	// Returns a command that, when applied, transforms this by [affineTransfm] and
	// updates the editor.
	public transformBy(affineTransfm: Mat33): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(affineTransfm, this);
	}

	// Returns a command that updates this component's z-index.
	public setZIndex(newZIndex: number): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(Mat33.identity, this, newZIndex);
	}

	// @returns true iff this component can be selected (e.g. by the selection tool.)
	public isSelectable(): boolean {
		return true;
	}

	// @returns an approximation of the proportional time it takes to render this component.
	// This is intended to be a rough estimate, but, for example, a stroke with two points sould have
	// a renderingWeight approximately twice that of a stroke with one point.
	public getProportionalRenderingTime(): number {
		return 1;
	}

	private static transformElementCommandId = 'transform-element';

	private static UnresolvedTransformElementCommand = class extends SerializableCommand {
		private command: SerializableCommand|null = null;

		public constructor(
			private affineTransfm: Mat33,
			private componentID: string,
			private targetZIndex?: number,
		) {
			super(AbstractComponent.transformElementCommandId);
		}

		private resolveCommand(editor: Editor) {
			if (this.command) {
				return;
			}

			const component = editor.image.lookupElement(this.componentID);
			if (!component) {
				throw new Error(`Unable to resolve component with ID ${this.componentID}`);
			}
			this.command = new AbstractComponent.TransformElementCommand(
				this.affineTransfm, component, this.targetZIndex
			);
		}

		public apply(editor: Editor) {
			this.resolveCommand(editor);
			this.command!.apply(editor);
		}

		public unapply(editor: Editor) {
			this.resolveCommand(editor);
			this.command!.unapply(editor);
		}

		public description(_editor: Editor, localizationTable: EditorLocalization) {
			return localizationTable.transformedElements(1);
		}

		protected serializeToJSON() {
			return {
				id: this.componentID,
				transfm: this.affineTransfm.toArray(),
				targetZIndex: this.targetZIndex,
			};
		}
	};

	private static TransformElementCommand = class extends SerializableCommand {
		private origZIndex: number;
		private targetZIndex: number;

		public constructor(
			private affineTransfm: Mat33,
			private component: AbstractComponent,
			targetZIndex?: number,
		) {
			super(AbstractComponent.transformElementCommandId);
			this.origZIndex = component.zIndex;
			this.targetZIndex = targetZIndex ?? AbstractComponent.zIndexCounter++;
		}

		private updateTransform(editor: Editor, newTransfm: Mat33) {
			// Any parent should have only one direct child.
			const parent = editor.image.findParent(this.component);
			let hadParent = false;
			if (parent) {
				parent.remove();
				hadParent = true;
			}

			this.component.applyTransformation(newTransfm);

			// Add the element back to the document.
			if (hadParent) {
				EditorImage.addElement(this.component).apply(editor);
			}
		}

		public apply(editor: Editor) {
			this.component.zIndex = this.targetZIndex;
			this.updateTransform(editor, this.affineTransfm);
			editor.queueRerender();
		}

		public unapply(editor: Editor) {
			this.component.zIndex = this.origZIndex;
			this.updateTransform(editor, this.affineTransfm.inverse());
			editor.queueRerender();
		}

		public description(_editor: Editor, localizationTable: EditorLocalization) {
			return localizationTable.transformedElements(1);
		}

		static {
			SerializableCommand.register(AbstractComponent.transformElementCommandId, (json: any, editor: Editor) => {
				const elem = editor.image.lookupElement(json.id);
				const transform = new Mat33(...(json.transfm as Mat33Array));
				const targetZIndex = json.targetZIndex;

				if (!elem) {
					return new AbstractComponent.UnresolvedTransformElementCommand(transform, json.id, targetZIndex);
				}

				return new AbstractComponent.TransformElementCommand(
					transform,
					elem,
					targetZIndex,
				);
			});
		}

		protected serializeToJSON() {
			return {
				id: this.component.getId(),
				transfm: this.affineTransfm.toArray(),
				targetZIndex: this.targetZIndex,
			};
		}
	};

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
	private static isNotDeserializable(json: any|string) {
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
	public static deserialize(json: string|any): AbstractComponent {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (AbstractComponent.isNotDeserializable(json)) {
			throw new Error(`Element with data ${json} cannot be deserialized.`);
		}

		const instance = this.deserializationCallbacks[json.name]!(json.data);
		instance.zIndex = json.zIndex;
		instance.id = json.id;
		
		// TODO: What should we do with json.loadSaveData?
		//       If we attach it to [instance], we create a potential security risk — loadSaveData
		//       is often used to store unrecognised attributes so they can be preserved on output.
		//       ...but what if we're deserializing data sent across the network?

		return instance;
	}
}
