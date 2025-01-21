import Editor from '../Editor';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import Viewport from '../Viewport';
import AbstractComponent, { ComponentSizingMode } from '../components/AbstractComponent';
import { Rect2, Vec2, Mat33, Mat33Array, Color4 } from '@js-draw/math';
import { EditorLocalization } from '../localization';
import RenderingCache from '../rendering/caching/RenderingCache';
import SerializableCommand from '../commands/SerializableCommand';
import EventDispatcher from '../EventDispatcher';
import { assertIsBoolean, assertIsNumber, assertIsNumberArray } from '../util/assertions';
import Command from '../commands/Command';

// @internal Sort by z-index, low to high
export const sortLeavesByZIndex = (leaves: Array<ImageNode>) => {
	leaves.sort((a, b) => a.getContent()!.getZIndex() - b.getContent()!.getZIndex());
};

export enum EditorImageEventType {
	ExportViewportChanged,
	AutoresizeModeChanged,
}

export type EditorImageNotifier = EventDispatcher<EditorImageEventType, { image: EditorImage }>;

/**
 * A callback used to
 * 1. pause the render process
 * 2. observe progress through `componentsProcessed` and `totalComponents`
 * 3. stop the render process early by returning `false`.
 */
export type PreRenderComponentCallback = (
	component: AbstractComponent,
	componentsProcessed: number,
	totalComponents: number,
) => Promise<boolean>;

let debugMode = false;

/**
 * Handles lookup/storage of elements in the image.
 *
 * `js-draw` images are made up of a collection of {@link AbstractComponent}s (which
 * includes {@link Stroke}s, {@link TextComponent}s, etc.). An `EditorImage`
 * is the data structure that stores these components.
 *
 * Here's how to do a few common operations:
 * - **Get all components in a {@link @js-draw/math!Rect2 | Rect2}**:
 *    {@link EditorImage.getElementsIntersectingRegion}.
 * - **Draw an `EditorImage` onto a canvas/SVG**: {@link EditorImage.render}.
 * - **Adding a new component**: {@link EditorImage.addElement}.
 *
 * **Example**:
 * [[include:doc-pages/inline-examples/image-add-and-lookup.md]]
 */
export default class EditorImage {
	private root: ImageNode;
	private background: ImageNode;
	private componentsById: Record<string, AbstractComponent>;
	private componentCount: number = 0;

	/** Viewport for the exported/imported image. */
	private importExportViewport: Viewport;

	// Whether the viewport should be autoresized on item add/remove.
	private shouldAutoresizeExportViewport: boolean;

	// @internal
	public readonly notifier: EditorImageNotifier;

	// @internal
	public constructor() {
		this.root = new RootImageNode();
		this.background = new RootImageNode();
		this.componentsById = Object.create(null);

		this.notifier = new EventDispatcher();
		this.importExportViewport = new Viewport(() => {
			this.onExportViewportChanged();
		});

		// Default to a 500x500 image
		this.importExportViewport.updateScreenSize(Vec2.of(500, 500));
		this.shouldAutoresizeExportViewport = false;
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
	public findParent(elem: AbstractComponent): ImageNode | null {
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
	public renderWithCache(
		screenRenderer: AbstractRenderer,
		cache: RenderingCache,
		viewport: Viewport,
	) {
		this.background.render(screenRenderer, viewport.visibleRect);

		// If in debug mode, avoid rendering with cache to show additional debug information
		if (!debugMode) {
			cache.render(screenRenderer, this.root, viewport);
		} else {
			this.root.render(screenRenderer, viewport.visibleRect);
		}
	}

	/**
	 * Renders this image to the given `renderer`.
	 *
	 * If `viewport` is non-null, only components that can be seen from that viewport
	 * will be rendered. If `viewport` is `null`, **all** components are rendered.
	 *
	 * **Example**:
	 * [[include:doc-pages/inline-examples/canvas-renderer.md]]
	 */
	public render(renderer: AbstractRenderer, viewport: Viewport | null) {
		this.background.render(renderer, viewport?.visibleRect);
		this.root.render(renderer, viewport?.visibleRect);
	}

	/**
	 * Like {@link renderAll}, but can be stopped early and paused.
	 *
	 * **Note**: If the image is being edited during an async rendering, there is no
	 * guarantee that all nodes will be rendered correctly (some may be missing).
	 *
	 * @internal
	 */
	public async renderAllAsync(
		renderer: AbstractRenderer,
		preRenderComponent: PreRenderComponentCallback,
	) {
		const stoppedEarly = !(await this.background.renderAllAsync(renderer, preRenderComponent));

		if (!stoppedEarly) {
			return await this.root.renderAllAsync(renderer, preRenderComponent);
		}

		return false;
	}

	/**
	 * Renders all nodes, even ones not within the viewport.
	 *
	 * This can be slow for large images
	 * @internal
	 */
	public renderAll(renderer: AbstractRenderer) {
		this.render(renderer, null);
	}

	/**
	 * @returns all elements in the image, sorted by z-index (low to high).
	 *
	 * This can be slow for large images. If you only need all elemenst in part of the image,
	 * consider using {@link getElementsIntersectingRegion} instead.
	 *
	 * **Note**: The result does not include background elements. See {@link getBackgroundComponents}.
	 */
	public getAllElements() {
		const leaves = this.root.getLeaves();
		sortLeavesByZIndex(leaves);

		return leaves.map((leaf) => leaf.getContent()!);
	}

	/** Returns the number of elements added to this image. @internal */
	public estimateNumElements() {
		return this.componentCount;
	}

	/**
	 * @returns a list of `AbstractComponent`s intersecting `region`, sorted by increasing z-index.
	 *
	 * Components in the background layer are only included if `includeBackground` is `true`.
	 */
	public getElementsIntersectingRegion(
		region: Rect2,
		includeBackground: boolean = false,
	): AbstractComponent[] {
		let leaves = this.root.getLeavesIntersectingRegion(region);

		if (includeBackground) {
			leaves = leaves.concat(this.background.getLeavesIntersectingRegion(region));
		}

		sortLeavesByZIndex(leaves);
		return leaves.map((leaf) => leaf.getContent()!);
	}

	/** Called whenever (just after) an element is completely removed. @internal */
	public onDestroyElement(elem: AbstractComponent) {
		this.componentCount--;
		delete this.componentsById[elem.getId()];

		this.autoresizeExportViewport();
	}

	/** Called just after an element is added. @internal */
	private onElementAdded(elem: AbstractComponent) {
		this.componentCount++;
		this.componentsById[elem.getId()] = elem;

		this.autoresizeExportViewport();
	}

	/**
	 * @returns the AbstractComponent with `id`, if it exists.
	 *
	 * @see {@link AbstractComponent.getId}
	 */
	public lookupElement(id: string): AbstractComponent | null {
		return this.componentsById[id] ?? null;
	}

	private addElementDirectly(elem: AbstractComponent): ImageNode {
		// Because onAddToImage can affect the element's bounding box,
		// this needs to be called before parentTree.addLeaf.
		elem.onAddToImage(this);

		// If a background component, add to the background. Else,
		// add to the normal component tree.
		const parentTree = elem.isBackground() ? this.background : this.root;
		const result = parentTree.addLeaf(elem);
		this.onElementAdded(elem);
		return result;
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
	 *
	 * **Example**:
	 *
	 * [[include:doc-pages/inline-examples/adding-a-stroke.md]]
	 */
	public static addElement(
		elem: AbstractComponent,
		applyByFlattening: boolean = false,
	): SerializableCommand {
		return new EditorImage.AddElementCommand(elem, applyByFlattening);
	}

	/** @see EditorImage.addElement */
	public addElement(elem: AbstractComponent, applyByFlattening?: boolean) {
		return EditorImage.addElement(elem, applyByFlattening);
	}

	// A Command that can access private [EditorImage] functionality
	private static AddElementCommand = class extends SerializableCommand {
		private serializedElem: any = null;

		// If [applyByFlattening], then the rendered content of this element
		// is present on the display's wet ink canvas. As such, no re-render is necessary
		// the first time this command is applied (the surfaces are joined instead).
		public constructor(
			private element: AbstractComponent,
			private applyByFlattening: boolean = false,
		) {
			super('add-element');

			// FIXME: The serialized version of this command may be inaccurate if this is
			//        serialized when this command is not on the top of the undo stack.
			//
			// Caching the element's serialized data leads to additional memory usage *and*
			// sometimes incorrect behavior in collaborative editing.
			this.serializedElem = null;

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
				elemData: this.serializedElem ?? this.element.serialize(),
			};
		}

		static {
			SerializableCommand.register('add-element', (json: any, editor: Editor) => {
				const id = json.elemData.id;
				const foundElem = editor.image.lookupElement(id);
				const elem = foundElem ?? AbstractComponent.deserialize(json.elemData);
				const result = new EditorImage.AddElementCommand(elem);
				result.serializedElem = json.elemData;
				return result;
			});
		}
	};

	/**
	 * @returns a `Viewport` for rendering the image when importing/exporting.
	 */
	public getImportExportViewport() {
		return this.importExportViewport;
	}

	/**
	 * @see {@link setImportExportRect}
	 */
	public getImportExportRect() {
		return this.getImportExportViewport().visibleRect;
	}

	/**
	 * Sets the import/export rectangle to the given `imageRect`. Disables
	 * autoresize if it was previously enabled.
	 *
	 * **Note**: The import/export rectangle is the same as the size of any
	 * {@link BackgroundComponent}s (and other components that auto-resize).
	 */
	public setImportExportRect(imageRect: Rect2): SerializableCommand {
		return EditorImage.SetImportExportRectCommand.of(this, imageRect, false);
	}

	/** @see {@link setAutoresizeEnabled} */
	public getAutoresizeEnabled() {
		return this.shouldAutoresizeExportViewport;
	}

	/**
	 * Returns a `Command` that sets whether the image should autoresize when
	 * {@link AbstractComponent}s are added/removed.
	 *
	 * @example
	 *
	 * ```ts,runnable
	 * import { Editor } from 'js-draw';
	 *
	 * const editor = new Editor(document.body);
	 * const toolbar = editor.addToolbar();
	 *
	 * // Add a save button to demonstrate what the output looks like
	 * // (it should change size to fit whatever was drawn)
	 * toolbar.addSaveButton(() => {
	 *   document.body.replaceChildren(editor.toSVG({ sanitize: true }));
	 * });
	 *
	 * // Actually using setAutoresizeEnabled:
	 * //
	 * // To set autoresize without announcing for accessibility/making undoable
	 * const addToHistory = false;
	 * editor.dispatchNoAnnounce(editor.image.setAutoresizeEnabled(true), addToHistory);
	 *
	 * // Add to undo history **and** announce for accessibility
	 * //editor.dispatch(editor.image.setAutoresizeEnabled(true), true);
	 * ```
	 */
	public setAutoresizeEnabled(autoresize: boolean): Command {
		if (autoresize === this.shouldAutoresizeExportViewport) {
			return Command.empty;
		}

		const newBBox = this.root.getBBox();
		return EditorImage.SetImportExportRectCommand.of(this, newBBox, autoresize);
	}

	private setAutoresizeEnabledDirectly(shouldAutoresize: boolean) {
		if (shouldAutoresize !== this.shouldAutoresizeExportViewport) {
			this.shouldAutoresizeExportViewport = shouldAutoresize;

			this.notifier.dispatch(EditorImageEventType.AutoresizeModeChanged, {
				image: this,
			});
		}
	}

	/** Updates the size/position of the viewport */
	private autoresizeExportViewport() {
		// Only autoresize if in autoresize mode -- otherwise resizing the image
		// should be done with undoable commands.
		if (this.shouldAutoresizeExportViewport) {
			this.setExportRectDirectly(this.root.getBBox());
		}
	}

	private settingExportRect: boolean = false;

	/**
	 * Sets the import/export viewport directly, without returning a `Command`.
	 * As such, this is not undoable.
	 *
	 * See setImportExportRect
	 *
	 * Returns true if changes to the viewport were made (and thus
	 * ExportViewportChanged was fired.)
	 */
	private setExportRectDirectly(newRect: Rect2) {
		const viewport = this.getImportExportViewport();
		const lastSize = viewport.getScreenRectSize();
		const lastTransform = viewport.canvasToScreenTransform;

		const newTransform = Mat33.translation(newRect.topLeft.times(-1));

		if (!lastSize.eq(newRect.size) || !lastTransform.eq(newTransform)) {
			// Prevent the ExportViewportChanged event from being fired
			// multiple times for the same viewport change: Set settingExportRect
			// to true.
			this.settingExportRect = true;
			viewport.updateScreenSize(newRect.size);
			viewport.resetTransform(newTransform);
			this.settingExportRect = false;

			this.onExportViewportChanged();
			return true;
		}
		return false;
	}

	private onExportViewportChanged() {
		// Prevent firing duplicate events -- changes
		// made by exportViewport.resetTransform may cause this method to be
		// called.
		if (!this.settingExportRect) {
			this.notifier.dispatch(EditorImageEventType.ExportViewportChanged, {
				image: this,
			});
		}
	}

	/**
	 * @internal
	 *
	 * Enables debug mode for **all** `EditorImage`s.
	 *
	 * **Only use for debugging**.
	 *
	 * @internal
	 */
	public static setDebugMode(newDebugMode: boolean) {
		debugMode = newDebugMode;
	}

	// Handles resizing the background import/export region of the image.
	private static SetImportExportRectCommand = class extends SerializableCommand {
		private static commandId = 'set-import-export-rect';

		private constructor(
			private originalSize: Vec2,
			private originalTransform: Mat33,
			private originalAutoresize: boolean,
			private newExportRect: Rect2,
			private newAutoresize: boolean,
		) {
			super(EditorImage.SetImportExportRectCommand.commandId);
		}

		// Uses `image` to store the original size/transform
		public static of(image: EditorImage, newExportRect: Rect2, newAutoresize: boolean) {
			const importExportViewport = image.getImportExportViewport();
			const originalSize = importExportViewport.visibleRect.size;
			const originalTransform = importExportViewport.canvasToScreenTransform;
			const originalAutoresize = image.getAutoresizeEnabled();

			return new EditorImage.SetImportExportRectCommand(
				originalSize,
				originalTransform,
				originalAutoresize,
				newExportRect,
				newAutoresize,
			);
		}

		public apply(editor: Editor) {
			editor.image.setAutoresizeEnabledDirectly(this.newAutoresize);
			editor.image.setExportRectDirectly(this.newExportRect);
			editor.queueRerender();
		}

		public unapply(editor: Editor) {
			const viewport = editor.image.getImportExportViewport();
			editor.image.setAutoresizeEnabledDirectly(this.originalAutoresize);
			viewport.updateScreenSize(this.originalSize);
			viewport.resetTransform(this.originalTransform);
			editor.queueRerender();
		}

		public description(_editor: Editor, localization: EditorLocalization) {
			if (this.newAutoresize !== this.originalAutoresize) {
				if (this.newAutoresize) {
					return localization.enabledAutoresizeOutputCommand;
				} else {
					return localization.disabledAutoresizeOutputCommand;
				}
			}
			return localization.resizeOutputCommand(this.newExportRect);
		}

		protected serializeToJSON() {
			return {
				originalSize: this.originalSize.xy,
				originalTransform: this.originalTransform.toArray(),
				newRegion: {
					x: this.newExportRect.x,
					y: this.newExportRect.y,
					w: this.newExportRect.w,
					h: this.newExportRect.h,
				},
				autoresize: this.newAutoresize,
				originalAutoresize: this.originalAutoresize,
			};
		}

		static {
			const commandId = this.commandId;
			SerializableCommand.register(commandId, (json: any, _editor: Editor) => {
				assertIsNumber(json.originalSize.x);
				assertIsNumber(json.originalSize.y);
				assertIsNumberArray(json.originalTransform);
				assertIsNumberArray([
					json.newRegion.x,
					json.newRegion.y,
					json.newRegion.w,
					json.newRegion.h,
				]);
				assertIsBoolean(json.autoresize ?? false);
				assertIsBoolean(json.originalAutoresize ?? false);

				const originalSize = Vec2.ofXY(json.originalSize);
				const originalTransform = new Mat33(...(json.originalTransform as Mat33Array));
				const finalRect = new Rect2(
					json.newRegion.x,
					json.newRegion.y,
					json.newRegion.w,
					json.newRegion.h,
				);
				const autoresize = json.autoresize ?? false;
				const originalAutoresize = json.originalAutoresize ?? false;

				return new EditorImage.SetImportExportRectCommand(
					originalSize,
					originalTransform,
					originalAutoresize,
					finalRect,
					autoresize,
				);
			});
		}
	};
}

/**
 * Determines the first index in `sortedLeaves` that needs to be rendered
 * (based on occlusion -- everything before that index can be skipped and
 * produce a visually-equivalent image).
 *
 * Does nothing if visibleRect is not provided
 *
 * @internal
 */
export const computeFirstIndexToRender = (sortedLeaves: Array<ImageNode>, visibleRect?: Rect2) => {
	let startIndex = 0;

	if (visibleRect) {
		for (let i = sortedLeaves.length - 1; i >= 1; i--) {
			if (
				// Check for occlusion
				sortedLeaves[i].getBBox().containsRect(visibleRect) &&
				sortedLeaves[i].getContent()?.occludesEverythingBelowWhenRenderedInRect(visibleRect)
			) {
				startIndex = i;
				break;
			}
		}
	}

	return startIndex;
};

type TooSmallToRenderCheck = (rect: Rect2) => boolean;

/**
 * Part of the Editor's image. Does not handle fullscreen/invisible components.
 * @internal
 */
export class ImageNode {
	private content: AbstractComponent | null;
	private bbox: Rect2;
	private children: ImageNode[];
	private targetChildCount: number = 30;

	private id: number;
	private static idCounter: number = 0;

	public constructor(private parent: ImageNode | null = null) {
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

	public getContent(): AbstractComponent | null {
		return this.content;
	}

	public getParent(): ImageNode | null {
		return this.parent;
	}

	// Override this to change how children are considered within a given region.
	protected getChildrenIntersectingRegion(
		region: Rect2,
		isTooSmallFilter?: TooSmallToRenderCheck,
	): ImageNode[] {
		return this.children.filter((child) => {
			const bbox = child.getBBox();
			return !isTooSmallFilter?.(bbox) && bbox.intersects(region);
		});
	}

	public getChildrenOrSelfIntersectingRegion(
		region: Rect2,
		isTooSmall?: TooSmallToRenderCheck,
	): ImageNode[] {
		if (this.content && this.bbox.intersects(region) && !isTooSmall?.(this.bbox)) {
			return [this];
		}
		return this.getChildrenIntersectingRegion(region, isTooSmall);
	}

	/**
	 * Returns a list of `ImageNode`s with content (and thus no children).
	 * Override getChildrenIntersectingRegion to customize how this method
	 * determines whether/which children are in `region`.
	 *
	 * @paran region - All resultant `ImageNode`s must intersect `region`.
	 * @param isTooSmall - If `isTooSmall` returns true for an image node, that node
	 *                     is excluded from the output.
	 *
	 */
	public getLeavesIntersectingRegion(
		region: Rect2,
		isTooSmall?: TooSmallToRenderCheck,
	): ImageNode[] {
		const result: ImageNode[] = [];
		const workList: ImageNode[] = [];

		workList.push(this);

		while (workList.length > 0) {
			const current = workList.pop()!;

			// Split the children into leaves and non-leaves
			const processed = current.getChildrenOrSelfIntersectingRegion(region, isTooSmall);
			for (const item of processed) {
				if (item.content) {
					result.push(item);
				} else {
					// Non-leaves need to be processed
					workList.push(item);
				}
			}
		}

		return result;
	}

	// Returns the child of this with the target content or `null` if no
	// such child exists.
	//
	// Note: Relies on all children to have valid bounding boxes.
	public getChildWithContent(target: AbstractComponent): ImageNode | null {
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
				nodeForChildren.updateParents();
				nodeForChildren.recomputeBBox(true);
			}
			return nodeForNewLeaf.addLeaf(leaf);
		}

		const containingNodes = this.children.filter((child) => child.getBBox().containsRect(leafBBox));

		// Does the leaf already fit within one of the children?
		if (containingNodes.length > 0 && this.children.length >= this.targetChildCount) {
			// Sort the containers in ascending order by area
			containingNodes.sort((a, b) => a.getBBox().area - b.getBBox().area);

			// Choose the smallest child that contains the new element.
			const result = containingNodes[0].addLeaf(leaf);
			result.rebalance();
			return result;
		}

		const newNode = ImageNode.createLeafNode(this, leaf);
		this.children.push(newNode);
		newNode.recomputeBBox(true);

		if (this.children.length >= this.targetChildCount) {
			this.rebalance();
		}

		return newNode;
	}

	// Creates a new leaf node with the given content.
	// This only establishes the parent-child linking in one direction. Callers
	// must add the resultant node to the list of children manually.
	protected static createLeafNode(parent: ImageNode, content: AbstractComponent) {
		const newNode = new ImageNode(parent);
		newNode.content = content;
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
			this.bbox = Rect2.union(...this.children.map((child) => child.getBBox()));
		}

		if (bubbleUp && !oldBBox.eq(this.bbox)) {
			if (this.bbox.containsRect(oldBBox)) {
				this.parent?.unionBBoxWith(this.bbox);
			} else {
				this.parent?.recomputeBBox(true);
			}
		}

		this.checkRep();
	}

	// Grows this' bounding box to also include `other`.
	// Always bubbles up.
	private unionBBoxWith(other: Rect2) {
		this.bbox = this.bbox.union(other);
		this.parent?.unionBBoxWith(other);
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
				const newParent = oldParent.parent;

				newParent.children = newParent.children.filter((c) => c !== oldParent);
				oldParent.parent = null;
				oldParent.children = [];

				this.parent = newParent;
				newParent.children.push(this);
				this.parent.recomputeBBox(false);
			} else if (this.content === null) {
				// Remove this and transfer this' children to the parent.
				this.parent.children = this.children;
				this.parent.updateParents();
				this.parent = null;
			}
		}

		// Create virtual containers for children. Handles the case where there
		// are many small, often non-overlapping children that we still want to be grouped.
		if (this.children.length > this.targetChildCount * 10) {
			const grid = this.getBBox().divideIntoGrid(4, 4);
			const indexToCount = [];
			while (indexToCount.length < grid.length) {
				indexToCount.push(0);
			}

			for (const child of this.children) {
				for (let i = 0; i < grid.length; i++) {
					if (grid[i].containsRect(child.getBBox())) {
						indexToCount[i]++;
					}
				}
			}

			let indexWithGreatest = 0;
			let greatestCount = indexToCount[0];
			for (let i = 1; i < indexToCount.length; i++) {
				if (indexToCount[i] > greatestCount) {
					indexWithGreatest = i;
					greatestCount = indexToCount[i];
				}
			}
			const targetGridSquare = grid[indexWithGreatest];

			// Avoid clustering if just a few children would be grouped.
			// Unnecessary clustering can lead to unnecessarily nested nodes.
			if (greatestCount > 4) {
				const newChildren = [];
				const childNodeChildren = [];
				for (const child of this.children) {
					if (targetGridSquare.containsRect(child.getBBox())) {
						childNodeChildren.push(child);
					} else {
						newChildren.push(child);
					}
				}

				if (childNodeChildren.length < this.children.length) {
					this.children = newChildren;

					const child = new ImageNode(this);
					this.children.push(child);
					child.children = childNodeChildren;
					child.updateParents(false);

					child.recomputeBBox(false);
					child.rebalance();
				}
			}
		}

		// Empty?
		if (this.parent && this.children.length === 0 && this.content === null) {
			this.remove();
		}
	}

	// Removes the parent-to-child link.
	// Called internally by `.remove`
	protected removeChild(child: ImageNode) {
		this.checkRep();

		const oldChildCount = this.children.length;
		this.children = this.children.filter((node) => {
			return node !== child;
		});

		console.assert(
			this.children.length === oldChildCount - 1,
			`${oldChildCount - 1} ≠ ${this.children.length} after removing all nodes equal to ${child}. Nodes should only be removed once.`,
		);

		this.children.forEach((child) => {
			child.rebalance();
		});

		this.recomputeBBox(true);
		this.rebalance();

		this.checkRep();
	}

	// Remove this node and all of its children
	public remove() {
		this.content?.onRemoveFromImage();

		if (!this.parent) {
			this.content = null;
			this.children = [];

			return;
		}
		this.parent.removeChild(this);

		// Remove the child-to-parent link and invalid this
		this.parent = null;
		this.content = null;
		this.children = [];

		this.checkRep();
	}

	// Creates a (potentially incomplete) async rendering of this image.
	// Returns false if stopped early
	public async renderAllAsync(
		renderer: AbstractRenderer,

		// Used to pause/stop the renderer process
		preRenderComponent: PreRenderComponentCallback,
	) {
		const leaves = this.getLeaves();
		sortLeavesByZIndex(leaves);

		const totalLeaves = leaves.length;

		for (let leafIndex = 0; leafIndex < totalLeaves; leafIndex++) {
			const leaf = leaves[leafIndex];
			const component = leaf.getContent();

			// Even though leaf was originally a leaf, it might not be any longer --
			// rendering is async and the tree can change during that time.
			if (!component) {
				continue;
			}

			const shouldContinue = await preRenderComponent(component, leafIndex, totalLeaves);

			if (!shouldContinue) {
				return false;
			}

			component.render(renderer, undefined);
		}

		return true;
	}

	public render(renderer: AbstractRenderer, visibleRect?: Rect2) {
		let leaves;
		if (visibleRect) {
			leaves = this.getLeavesIntersectingRegion(visibleRect, (rect) =>
				renderer.isTooSmallToRender(rect),
			);
		} else {
			leaves = this.getLeaves();
		}
		sortLeavesByZIndex(leaves);

		// If some components hide others (and we're permitted to simplify,
		// which is true in the case of visibleRect being defined), then only
		// draw the non-hidden components:
		const startIndex = computeFirstIndexToRender(leaves);

		for (let i = startIndex; i < leaves.length; i++) {
			const leaf = leaves[i];
			// Leaves by definition have content
			leaf.getContent()!.render(renderer, visibleRect);
		}

		// Show debug information
		if (debugMode && visibleRect) {
			if (startIndex !== 0) {
				console.log('EditorImage: skipped ', startIndex, 'nodes due to occlusion');
			}

			this.renderDebugBoundingBoxes(renderer, visibleRect);
		}
	}

	// Debug only: Shows bounding boxes of this and all children.
	public renderDebugBoundingBoxes(
		renderer: AbstractRenderer,
		visibleRect: Rect2,
		depth: number = 0,
	) {
		const bbox = this.getBBox();
		const pixelSize = 1 / (renderer.getSizeOfCanvasPixelOnScreen() || 1);

		if (bbox.maxDimension < 3 * pixelSize || !bbox.intersects(visibleRect)) {
			return;
		}

		// Render debug information for this
		renderer.startObject(bbox);

		// Different styling for leaf nodes
		const isLeaf = !!this.content;
		const fill = isLeaf ? Color4.ofRGBA(1, 0, 1, 0.4) : Color4.ofRGBA(0, 1, Math.sin(depth), 0.6);
		const lineWidth = isLeaf ? 1 * pixelSize : 2 * pixelSize;

		renderer.drawRect(bbox.intersection(visibleRect)!, lineWidth, { fill });
		renderer.endObject();

		if (bbox.maxDimension > visibleRect.maxDimension / 3) {
			const textStyle = {
				fontFamily: 'monospace',
				size: bbox.minDimension / 20,
				renderingStyle: { fill: Color4.red },
			};
			renderer.drawText(`Depth: ${depth}`, Mat33.translation(bbox.bottomLeft), textStyle);
		}

		// Render debug information for children
		for (const child of this.children) {
			child.renderDebugBoundingBoxes(renderer, visibleRect, depth + 1);
		}
	}

	private checkRep(depth: number = 0) {
		// Slow -- disabld by default
		if (debugMode) {
			if (this.parent && !this.parent.children.includes(this)) {
				throw new Error(`Parent does not have this node as a child. (depth: ${depth})`);
			}

			let expectedBBox = null;
			const seenChildren: Set<ImageNode> = new Set();
			for (const child of this.children) {
				expectedBBox ??= child.getBBox();
				expectedBBox = expectedBBox.union(child.getBBox());

				if (child.parent !== this) {
					throw new Error(
						`Child with bbox ${child.getBBox()} and ${child.children.length} has wrong parent (was ${child.parent}).`,
					);
				}

				// Children should only be present once
				if (seenChildren.has(child)) {
					throw new Error(`Child ${child} is present twice or more in its parent's child list`);
				}
				seenChildren.add(child);
			}

			const tolerance = this.bbox.minDimension / 100;
			if (expectedBBox && !this.bbox.eq(expectedBBox, tolerance)) {
				throw new Error(`Wrong bounding box ${expectedBBox} \\neq ${this.bbox} (depth: ${depth})`);
			}
		}
	}
}

/** An `ImageNode` that can properly handle fullscreen/data components. @internal */
export class RootImageNode extends ImageNode {
	// Nodes that will always take up the entire screen
	private fullscreenChildren: ImageNode[] = [];

	// Nodes that will never be visible unless a full render is done.
	private dataComponents: ImageNode[] = [];

	protected override getChildrenIntersectingRegion(
		region: Rect2,
		_isTooSmall?: TooSmallToRenderCheck,
	) {
		const result = super.getChildrenIntersectingRegion(region);

		for (const node of this.fullscreenChildren) {
			result.push(node);
		}

		return result;
	}

	public override getChildrenOrSelfIntersectingRegion(
		region: Rect2,
		_isTooSmall?: TooSmallToRenderCheck,
	): ImageNode[] {
		const content = this.getContent();
		// Fullscreen components always intersect/contain
		if (content && content.getSizingMode() === ComponentSizingMode.FillScreen) {
			return [this];
		}

		return super.getChildrenOrSelfIntersectingRegion(region, _isTooSmall);
	}

	public override getLeaves(): ImageNode[] {
		const leaves = super.getLeaves();

		// Add fullscreen/data components — this method should
		// return *all* leaves.
		return this.dataComponents.concat(this.fullscreenChildren, leaves);
	}

	public override removeChild(child: ImageNode) {
		let removed = false;

		const checkTargetChild = (component: ImageNode) => {
			const isTarget = component === child;
			removed ||= isTarget;
			return !isTarget;
		};

		// Check whether the child is stored in the data/fullscreen
		// component arrays first.
		this.dataComponents = this.dataComponents.filter(checkTargetChild);
		this.fullscreenChildren = this.fullscreenChildren.filter(checkTargetChild);

		if (!removed) {
			super.removeChild(child);
		}
	}

	public override getChildWithContent(target: AbstractComponent): ImageNode | null {
		const searchExtendedChildren = () => {
			// Search through all extended children
			const candidates = this.fullscreenChildren.concat(this.dataComponents);

			for (const candidate of candidates) {
				if (candidate.getContent() === target) {
					return candidate;
				}
			}

			return null;
		};

		// If positioned as if a standard child, search using the superclass first.
		// Because it could be mislabeled, also search the extended children if the superclass
		// search fails.
		if (target.getSizingMode() === ComponentSizingMode.BoundingBox) {
			return super.getChildWithContent(target) ?? searchExtendedChildren();
		}

		// Fall back to the superclass -- it's possible that the component has
		// changed labels.
		return super.getChildWithContent(target) ?? searchExtendedChildren();
	}

	public override addLeaf(leafContent: AbstractComponent): ImageNode {
		const sizingMode = leafContent.getSizingMode();

		if (sizingMode === ComponentSizingMode.BoundingBox) {
			return super.addLeaf(leafContent);
		} else if (sizingMode === ComponentSizingMode.FillScreen) {
			this.onContentChange();

			const newNode = ImageNode.createLeafNode(this, leafContent);
			this.fullscreenChildren.push(newNode);
			return newNode;
		} else if (sizingMode === ComponentSizingMode.Anywhere) {
			this.onContentChange();

			const newNode = ImageNode.createLeafNode(this, leafContent);
			this.dataComponents.push(newNode);
			return newNode;
		} else {
			const exhaustivenessCheck: never = sizingMode;
			throw new Error(`Invalid sizing mode, ${sizingMode}`);
			return exhaustivenessCheck;
		}
	}
}
