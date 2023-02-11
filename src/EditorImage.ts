import Editor from './Editor';
import AbstractRenderer from './rendering/renderers/AbstractRenderer';
import Viewport from './Viewport';
import AbstractComponent from './components/AbstractComponent';
import Rect2 from './math/Rect2';
import { EditorLocalization } from './localization';
import RenderingCache from './rendering/caching/RenderingCache';
import SerializableCommand from './commands/SerializableCommand';
import EventDispatcher from './EventDispatcher';
import { Vec2 } from './math/Vec2';
import Command from './commands/Command';
import Mat33 from './math/Mat33';

// @internal Sort by z-index, low to high
export const sortLeavesByZIndex = (leaves: Array<ImageNode>) => {
	leaves.sort((a, b) => a.getContent()!.getZIndex() - b.getContent()!.getZIndex());
};

export enum EditorImageEventType {
	ExportViewportChanged
}

export type EditorImageNotifier = EventDispatcher<EditorImageEventType, { image: EditorImage }>;

// Handles lookup/storage of elements in the image
export default class EditorImage {
	private root: ImageNode;
	private background: ImageNode;
	private componentsById: Record<string, AbstractComponent>;

	/** Viewport for the exported/imported image. */
	private importExportViewport: Viewport;

	// @internal
	public readonly notifier: EditorImageNotifier;

	// @internal
	public constructor() {
		this.root = new ImageNode();
		this.background = new ImageNode();
		this.componentsById = {};

		this.notifier = new EventDispatcher();
		this.importExportViewport = new Viewport(() => {
			this.notifier.dispatch(EditorImageEventType.ExportViewportChanged, {
				image: this,
			});
		});

		// Default to a 500x500 image
		this.importExportViewport.updateScreenSize(Vec2.of(500, 500));
	}

	/**
	 * @returns a `Viewport` for rendering the image when importing/exporting.
	 */
	public getImportExportViewport() {
		return this.importExportViewport;
	}

	public setImportExportRect(imageRect: Rect2): Command {
		const importExportViewport = this.getImportExportViewport();
		const origSize = importExportViewport.visibleRect.size;
		const origTransform = importExportViewport.canvasToScreenTransform;

		return new class extends Command {
			public apply(editor: Editor) {
				const viewport = editor.image.getImportExportViewport();
				viewport.updateScreenSize(imageRect.size);
				viewport.resetTransform(Mat33.translation(imageRect.topLeft.times(-1)));
				editor.queueRerender();
			}

			public unapply(editor: Editor) {
				const viewport = editor.image.getImportExportViewport();
				viewport.updateScreenSize(origSize);
				viewport.resetTransform(origTransform);
				editor.queueRerender();
			}

			public description(_editor: Editor, localizationTable: EditorLocalization) {
				return localizationTable.resizeOutputCommand(imageRect);
			}
		};
	}

	// Returns all components that make up the background of this image. These
	// components are rendered below all other components.
	public getBackgroundComponents(): AbstractComponent[] {
		const result = [];

		const leaves = this.background.getLeaves();
		sortLeavesByZIndex(leaves);

		for (const leaf of leaves) {
			const content = leaf.getContent();

			if (content) {
				result.push(content);
			}
		}
		return result;
	}

	// Returns the parent of the given element, if it exists.
	public findParent(elem: AbstractComponent): ImageNode|null {
		return this.background.getChildWithContent(elem) ?? this.root.getChildWithContent(elem);
	}

	// Forces a re-render of `elem` when the image is next re-rendered as a whole.
	// Does nothing if `elem` is not in this.
	public queueRerenderOf(elem: AbstractComponent) {
		// TODO: Make more efficient (e.g. increase IDs of all parents,
		// make cache take into account last modified time instead of IDs, etc.)
		const parent = this.findParent(elem);

		if (parent) {
			parent.remove();
			this.addElementDirectly(elem);
		}
	}

	/** @internal */
	public renderWithCache(screenRenderer: AbstractRenderer, cache: RenderingCache, viewport: Viewport) {
		this.background.render(screenRenderer, viewport.visibleRect);
		cache.render(screenRenderer, this.root, viewport);
	}

	/**
	 * Renders all nodes visible from `viewport` (or all nodes if `viewport = null`)
	 * @internal
	 */
	public render(renderer: AbstractRenderer, viewport: Viewport|null) {
		this.background.render(renderer, viewport?.visibleRect);
		this.root.render(renderer, viewport?.visibleRect);
	}

	/** Renders all nodes, even ones not within the viewport. @internal */
	public renderAll(renderer: AbstractRenderer) {
		this.render(renderer, null);
	}

	/** @returns all elements in the image, sorted by z-index. This can be slow for large images. */
	public getAllElements() {
		const leaves = this.root.getLeaves();
		sortLeavesByZIndex(leaves);

		return leaves.map(leaf => leaf.getContent()!);
	}

	/** @returns a list of `AbstractComponent`s intersecting `region`, sorted by z-index. */
	public getElementsIntersectingRegion(region: Rect2): AbstractComponent[] {
		const leaves = this.root.getLeavesIntersectingRegion(region);
		sortLeavesByZIndex(leaves);

		return leaves.map(leaf => leaf.getContent()!);
	}

	/** @internal */
	public onDestroyElement(elem: AbstractComponent) {
		delete this.componentsById[elem.getId()];
	}

	/**
	 * @returns the AbstractComponent with `id`, if it exists.
	 * 
	 * @see {@link AbstractComponent.getId}
	 */
	public lookupElement(id: string): AbstractComponent|null {
		return this.componentsById[id] ?? null;
	}

	private addElementDirectly(elem: AbstractComponent): ImageNode {
		elem.onAddToImage(this);

		this.componentsById[elem.getId()] = elem;

		// If a background component, add to the background. Else,
		// add to the normal component tree.
		const parentTree = elem.isBackground() ? this.background : this.root;
		return parentTree.addLeaf(elem);
	}

	private removeElementDirectly(element: AbstractComponent) {
		const container = this.findParent(element);
		container?.remove();

		if (container) {
			this.onDestroyElement(element);
			return true;
		}

		return false;
	}

	/**
	 * Returns a command that adds the given element to the `EditorImage`.
	 * If `applyByFlattening` is true, the content of the wet ink renderer is
	 * rendered onto the main rendering canvas instead of doing a full re-render.
	 * 
	 * @see {@link Display.flatten}
	 */
	public static addElement(elem: AbstractComponent, applyByFlattening: boolean = false): SerializableCommand {
		return new EditorImage.AddElementCommand(elem, applyByFlattening);
	}

	/** @see EditorImage.addElement */
	public addElement(elem: AbstractComponent, applyByFlattening: boolean = true) {
		return EditorImage.addElement(elem, applyByFlattening);
	}

	// A Command that can access private [EditorImage] functionality
	private static AddElementCommand = class extends SerializableCommand {
		private serializedElem: any;

		// If [applyByFlattening], then the rendered content of this element
		// is present on the display's wet ink canvas. As such, no re-render is necessary
		// the first time this command is applied (the surfaces are joined instead).
		public constructor(
			private element: AbstractComponent,
			private applyByFlattening: boolean = false
		) {
			super('add-element');

			// Store the element's serialization --- .serializeToJSON may be called on this
			// even when this is not at the top of the undo/redo stack.
			this.serializedElem = element.serialize();

			if (isNaN(element.getBBox().area)) {
				throw new Error('Elements in the image cannot have NaN bounding boxes');
			}
		}

		public apply(editor: Editor) {
			editor.image.addElementDirectly(this.element);

			if (!this.applyByFlattening) {
				editor.queueRerender();
			} else {
				this.applyByFlattening = false;
				editor.display.flatten();
			}
		}

		public unapply(editor: Editor) {
			editor.image.removeElementDirectly(this.element);
			editor.queueRerender();
		}

		public description(_editor: Editor, localization: EditorLocalization) {
			return localization.addElementAction(this.element.description(localization));
		}

		protected serializeToJSON() {
			return {
				elemData: this.serializedElem,
			};
		}

		static {
			SerializableCommand.register('add-element', (json: any, editor: Editor) => {
				const id = json.elemData.id;
				const foundElem = editor.image.lookupElement(id);
				const elem = foundElem ?? AbstractComponent.deserialize(json.elemData);
				return new EditorImage.AddElementCommand(elem);
			});
		}
	};
}

type TooSmallToRenderCheck = (rect: Rect2)=> boolean;

/** Part of the Editor's image. @internal */
export class ImageNode {
	private content: AbstractComponent|null;
	private bbox: Rect2;
	private children: ImageNode[];
	private targetChildCount: number = 30;

	private id: number;
	private static idCounter: number = 0;

	public constructor(
		private parent: ImageNode|null = null
	) {
		this.children = [];
		this.bbox = Rect2.empty;
		this.content = null;

		this.id = ImageNode.idCounter++;
	}

	public getId() {
		return this.id;
	}

	public onContentChange() {
		this.id = ImageNode.idCounter++;
	}

	public getContent(): AbstractComponent|null {
		return this.content;
	}

	public getParent(): ImageNode|null {
		return this.parent;
	}

	private getChildrenIntersectingRegion(region: Rect2): ImageNode[] {
		return this.children.filter(child => {
			return child.getBBox().intersects(region);
		});
	}

	public getChildrenOrSelfIntersectingRegion(region: Rect2): ImageNode[] {
		if (this.content) {
			return [this];
		}
		return this.getChildrenIntersectingRegion(region);
	}

	// Returns a list of `ImageNode`s with content (and thus no children).
	public getLeavesIntersectingRegion(region: Rect2, isTooSmall?: TooSmallToRenderCheck): ImageNode[] {
		const result: ImageNode[] = [];
		let current: ImageNode|undefined;
		const workList: ImageNode[] = [];

		workList.push(this);
		const toNext = () => {
			current = undefined;

			const next = workList.pop();
			if (next && !isTooSmall?.(next.bbox)) {
				current = next;

				if (current.content !== null && current.getBBox().intersection(region)) {
					result.push(current);
				}

				workList.push(
					...current.getChildrenIntersectingRegion(region)
				);
			}
		};

		while (workList.length > 0) {
			toNext();
		}

		return result;
	}

	// Returns the child of this with the target content or `null` if no
	// such child exists.
	public getChildWithContent(target: AbstractComponent): ImageNode|null {
		const candidates = this.getLeavesIntersectingRegion(target.getBBox());
		for (const candidate of candidates) {
			if (candidate.getContent() === target) {
				return candidate;
			}
		}

		return null;
	}

	// Returns a list of leaves with this as an ancestor.
	// Like getLeavesInRegion, but does not check whether ancestors are in a given rectangle
	public getLeaves(): ImageNode[] {
		if (this.content) {
			return [this];
		}

		const result: ImageNode[] = [];
		for (const child of this.children) {
			result.push(...child.getLeaves());
		}

		return result;
	}

	public addLeaf(leaf: AbstractComponent): ImageNode {
		this.onContentChange();

		if (this.content === null && this.children.length === 0) {
			this.content = leaf;
			this.recomputeBBox(true);

			return this;
		}

		if (this.content !== null) {
			console.assert(this.children.length === 0);

			const contentNode = new ImageNode(this);
			contentNode.content = this.content;
			this.content = null;
			this.children.push(contentNode);
			contentNode.recomputeBBox(false);
		}

		// If this node is contained within the leaf, make this and the leaf
		// share a parent.
		const leafBBox = leaf.getBBox();
		if (leafBBox.containsRect(this.getBBox())) {
			const nodeForNewLeaf = new ImageNode(this);

			if (this.children.length < this.targetChildCount) {
				this.children.push(nodeForNewLeaf);
			} else {
				const nodeForChildren = new ImageNode(this);

				nodeForChildren.children = this.children;
				this.children = [nodeForNewLeaf, nodeForChildren];
				nodeForChildren.recomputeBBox(true);
				nodeForChildren.updateParents();
			}
			return nodeForNewLeaf.addLeaf(leaf);
		}

		const containingNodes = this.children.filter(
			child => child.getBBox().containsRect(leafBBox)
		);

		// Does the leaf already fit within one of the children?
		if (containingNodes.length > 0 && this.children.length >= this.targetChildCount) {
			// Sort the containers in ascending order by area
			containingNodes.sort((a, b) => a.getBBox().area - b.getBBox().area);

			// Choose the smallest child that contains the new element.
			const result = containingNodes[0].addLeaf(leaf);
			result.rebalance();
			return result;
		}


		const newNode = new ImageNode(this);
		this.children.push(newNode);
		newNode.content = leaf;
		newNode.recomputeBBox(true);

		return newNode;
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	// Recomputes this' bounding box. If [bubbleUp], also recompute
	// this' ancestors bounding boxes. This also re-computes this' bounding box
	// in the z-direction (z-indicies).
	public recomputeBBox(bubbleUp: boolean) {
		const oldBBox = this.bbox;
		if (this.content !== null) {
			this.bbox = this.content.getBBox();
		} else {
			this.bbox = Rect2.union(...this.children.map(child => child.getBBox()));
		}

		if (bubbleUp && !oldBBox.eq(this.bbox)) {
			this.parent?.recomputeBBox(true);
		}
	}

	private updateParents(recursive: boolean = false) {
		for (const child of this.children) {
			child.parent = this;

			if (recursive) {
				child.updateParents(recursive);
			}
		}
	}

	private rebalance() {
		// If the current node is its parent's only child,
		if (this.parent && this.parent.children.length === 1) {
			console.assert(this.parent.content === null);
			console.assert(this.parent.children[0] === this);

			// Remove this' parent, if this' parent isn't the root.
			const oldParent = this.parent;
			if (oldParent.parent !== null) {
				oldParent.children = [];
				this.parent = oldParent.parent;
				this.parent.children.push(this);
				oldParent.parent = null;
				this.parent.recomputeBBox(false);
			} else if (this.content === null) {
				// Remove this and transfer this' children to the parent.
				this.parent.children = this.children;
				this.parent.updateParents();
				this.parent = null;
			}
		}
	}

	// Remove this node and all of its children
	public remove() {
		this.content?.onRemoveFromImage();

		if (!this.parent) {
			this.content = null;
			this.children = [];

			return;
		}

		const oldChildCount = this.parent.children.length;
		this.parent.children = this.parent.children.filter(node => {
			return node !== this;
		});

		console.assert(
			this.parent.children.length === oldChildCount - 1,
			`${oldChildCount - 1} ≠ ${this.parent.children.length} after removing all nodes equal to ${this}. Nodes should only be removed once.`
		);

		this.parent.children.forEach(child => {
			child.rebalance();
		});

		this.parent.recomputeBBox(true);

		// Invalidate/disconnect this.
		this.content = null;
		this.parent = null;
		this.children = [];
	}

	public render(renderer: AbstractRenderer, visibleRect?: Rect2) {
		let leaves;
		if (visibleRect) {
			leaves = this.getLeavesIntersectingRegion(visibleRect, rect => renderer.isTooSmallToRender(rect));
		} else {
			leaves = this.getLeaves();
		}
		sortLeavesByZIndex(leaves);

		for (const leaf of leaves) {
			// Leaves by definition have content
			leaf.getContent()!.render(renderer, visibleRect);
		}
	}
}
