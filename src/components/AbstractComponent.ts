import SerializableCommand from '../commands/SerializableCommand';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
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
	// @see { @link EditorImage!default.lookupElement }
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

	// Return null iff this object cannot be safely serialized/deserialized.
	protected abstract serializeToString(): string|null;

	// Private helper for transformBy: Apply the given transformation to all points of this.
	protected abstract applyTransformation(affineTransfm: Mat33): void;

	// Returns a command that, when applied, transforms this by [affineTransfm] and
	// updates the editor.
	public transformBy(affineTransfm: Mat33): SerializableCommand {
		return new AbstractComponent.TransformElementCommand(affineTransfm, this);
	}

	private static TransformElementCommand = class extends SerializableCommand {
		private origZIndex: number;

		public constructor(
			private affineTransfm: Mat33,
			private component: AbstractComponent,
		) {
			super('transform-element');
			this.origZIndex = component.zIndex;
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
			this.component.zIndex = AbstractComponent.zIndexCounter++;
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
			SerializableCommand.register('transform-element', (json: any, editor: Editor) => {
				const elem = editor.image.lookupElement(json.id);

				if (!elem) {
					throw new Error(`Unable to retrieve non-existent element, ${elem}`);
				}

				const transform = json.transfm as [
					number, number, number,
					number, number, number,
					number, number, number,
				];

				return new AbstractComponent.TransformElementCommand(
					new Mat33(...transform),
					elem,
				);
			});
		}

		protected serializeToJSON() {
			return {
				id: this.component.getId(),
				transfm: this.affineTransfm.toArray(),
			};
		}
	};

	public abstract description(localizationTable: ImageComponentLocalization): string;

	protected abstract createClone(): AbstractComponent;

	public clone() {
		const clone = this.createClone();

		for (const attachmentKey in this.loadSaveData) {
			for (const val of this.loadSaveData[attachmentKey]) {
				clone.attachLoadSaveData(attachmentKey, val);
			}
		}

		return clone;
	}

	public serialize() {
		const data = this.serializeToString();

		if (data === null) {
			throw new Error(`${this} cannot be serialized.`);
		}

		return JSON.stringify({
			name: this.componentKind,
			zIndex: this.zIndex,
			id: this.id,
			loadSaveData: this.loadSaveData,
			data,
		});
	}

	// Returns true if [data] is not deserializable. May return false even if [data]
	// is not deserializable.
	private static isNotDeserializable(data: string) {
		const json = JSON.parse(data);

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

	public static deserialize(data: string): AbstractComponent {
		if (AbstractComponent.isNotDeserializable(data)) {
			throw new Error(`Element with data ${data} cannot be deserialized.`);
		}

		const json = JSON.parse(data);
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
