
// A cache record with sub-nodes.

import Color4 from '../../Color4';
import { ImageNode, sortLeavesByZIndex } from '../../EditorImage';
import Rect2 from '../../geometry/Rect2';
import Viewport from '../../Viewport';
import AbstractRenderer from '../renderers/AbstractRenderer';
import CacheRecord from './CacheRecord';
import { CacheState } from './types';

// 3x3 divisions for each node.
const cacheDivisionSize = 3;

// True: Show rendering updates.
const debugMode = false;

export default class RenderingCacheNode {
	// invariant: instantiatedChildren.length === 9
	private instantiatedChildren: RenderingCacheNode[] = [];
	private parent: RenderingCacheNode|null = null;

	private cachedRenderer: CacheRecord|null = null;
	// invariant: sortedInAscendingOrder(renderedIds)
	private renderedIds: Array<number> = [];
	private renderedMaxZIndex: number|null = null;

	public constructor(
		public readonly region: Rect2, private readonly cacheState: CacheState
	) {
	}

	// Creates a previous layer of the cache tree and adds this as a child near the
	// center of the previous layer's children.
	// Returns this' parent if it already exists.
	public generateParent(): RenderingCacheNode {
		if (this.parent) {
			return this.parent;
		}

		const parentRegion = Rect2.fromCorners(
			this.region.topLeft.minus(this.region.size),
			this.region.bottomRight.plus(this.region.size)
		);
		const parent = new RenderingCacheNode(parentRegion, this.cacheState);
		parent.generateChildren();

		// Ensure the new node is matches the middle child's region.
		const checkTolerance = this.region.maxDimension / 100;
		const middleChildIdx = (parent.instantiatedChildren.length - 1) / 2;
		if (!parent.instantiatedChildren[middleChildIdx].region.eq(this.region, checkTolerance)) {
			console.error(parent.instantiatedChildren[middleChildIdx].region, '≠', this.region);
			throw new Error('Logic error: [this] is not contained within its parent\'s center child');
		}

		// Replace the middle child
		parent.instantiatedChildren[middleChildIdx] = this;
		this.parent = parent;

		return parent;
	}

	// Generates children, if missing.
	private generateChildren() {
		if (this.instantiatedChildren.length === 0) {
			const childRects = this.region.divideIntoGrid(cacheDivisionSize, cacheDivisionSize);

			if (this.region.size.x === 0 || this.region.size.y === 0) {
				console.warn('Cache element has zero size! Not generating children.');
				return;
			}

			for (const rect of childRects) {
				const child = new RenderingCacheNode(rect, this.cacheState);
				child.parent = this;
				this.instantiatedChildren.push(child);
			}
		}
		this.checkRep();
	}

	// Returns CacheNodes directly contained within this.
	private getChildren(): RenderingCacheNode[] {
		this.checkRep();
		this.generateChildren();

		return this.instantiatedChildren;
	}

	public smallestChildContaining(rect: Rect2): RenderingCacheNode|null {
		const largerThanChildren = rect.maxDimension > this.region.maxDimension / cacheDivisionSize;
		if (!this.region.containsRect(rect) || largerThanChildren) {
			return null;
		}

		for (const child of this.getChildren()) {
			if (child.region.containsRect(rect)) {
				return child.smallestChildContaining(rect) ?? child;
			}
		}

		return null;
	}

	// => [true] iff [this] can be rendered without too much scaling
	private renderingWouldBeHighEnoughResolution(viewport: Viewport) {
		// Determine how 1px in this corresponds to 1px on the canvas.
		//  this.region.w is in canvas units. Thus,
		const sizeOfThisPixelOnCanvas = this.region.w / this.cacheState.props.blockResolution.x;
		const sizeOfThisPixelOnScreen = viewport.getScaleFactor() * sizeOfThisPixelOnCanvas;

		if (sizeOfThisPixelOnScreen > this.cacheState.props.maxScale) {
			return false;
		}
		return true;
	}

	// => [true] if all children of this can be rendered from their caches.
	private allChildrenCanRender(viewport: Viewport, leavesSortedById: ImageNode[]) {
		if (this.instantiatedChildren.length === 0) {
			return false;
		}

		for (const child of this.instantiatedChildren) {
			if (!child.region.intersects(viewport.visibleRect)) {
				continue;
			}

			if (!child.renderingIsUpToDate(this.idsOfIntersecting(leavesSortedById))) {
				return false;
			}
		}

		return true;
	}

	private computeSortedByLeafIds(leaves: ImageNode[]) {
		const ids = leaves.slice();
		ids.sort((a, b) => a.getId() - b.getId());
		return ids;
	}

	// Returns a list of the ids of the nodes intersecting this
	private idsOfIntersecting(nodes: ImageNode[]) {
		const result = [];
		for (const node of nodes) {
			if (node.getBBox().intersects(this.region)) {
				result.push(node.getId());
			}
		}
		return result;
	}

	private renderingIsUpToDate(sortedIds: number[]) {
		if (this.cachedRenderer === null || sortedIds.length !== this.renderedIds.length) {
			return false;
		}

		for (let i = 0; i < sortedIds.length; i++) {
			if (sortedIds[i] !== this.renderedIds[i]) {
				return false;
			}
		}

		return true;
	}

	// Render all [items] within [viewport]
	public renderItems(screenRenderer: AbstractRenderer, items: ImageNode[], viewport: Viewport) {
		if (
			!viewport.visibleRect.intersects(this.region)
			|| items.length === 0
		) {
			return;
		}

		const newItems = [];
		// Divide [items] until nodes are leaves or smaller than this
		for (const item of items) {
			const bbox = item.getBBox();
			if (!bbox.intersects(this.region)) {
				continue;
			}

			if (bbox.maxDimension >= this.region.maxDimension) {
				newItems.push(...item.getChildrenOrSelfIntersectingRegion(this.region));
			} else {
				newItems.push(item);
			}
		}
		items = newItems;

		// Can we cache at all?
		if (!this.cacheState.props.isOfCorrectType(screenRenderer)) {
			items.forEach(item => item.render(screenRenderer, viewport.visibleRect));
			return;
		}

		if (debugMode) {
			screenRenderer.drawRect(this.region, 0.5 * viewport.getSizeOfPixelOnCanvas(), { fill: Color4.yellow });
		}

		// Could we render direclty from [this] or do we need to recurse?
		const couldRender = this.renderingWouldBeHighEnoughResolution(viewport);
		if (!couldRender) {
			for (const child of this.getChildren()) {
				child.renderItems(screenRenderer, items.filter(item => {
					return item.getBBox().intersects(child.region);
				}), viewport);
			}
		} else {
			// Determine whether we already have rendered the items
			const leaves = [];
			for (const item of items) {
				leaves.push(
					...item.getLeavesIntersectingRegion(
						this.region, rect => rect.w / this.region.w < 2 / this.cacheState.props.blockResolution.x,
					)
				);
			}
			sortLeavesByZIndex(leaves);
			const leavesByIds = this.computeSortedByLeafIds(leaves);

			// No intersecting leaves? No need to render
			if (leavesByIds.length === 0) {
				return;
			}

			const leafIds = leavesByIds.map(leaf => leaf.getId());

			let thisRenderer;
			if (!this.renderingIsUpToDate(leafIds)) {
				if (this.allChildrenCanRender(viewport, leavesByIds)) {
					for (const child of this.getChildren()) {
						child.renderItems(screenRenderer, items, viewport);
					}
					return;
				}

				// Is it worth it to render the items?
				// TODO: Replace this with something performace based.
				// TODO: Determine whether it is 'worth it' to cache this depending on rendering time.
				if (leavesByIds.length > this.cacheState.props.minComponentsPerCache) {
					let fullRerenderNeeded = true;
					if (!this.cachedRenderer) {
						this.cachedRenderer = this.cacheState.recordManager.allocCanvas(
							this.region,
							() => this.onRegionDealloc()
						);
					} else if (leavesByIds.length > this.renderedIds.length && this.renderedMaxZIndex !== null) {
						// We often don't need to do a full re-render even if something's changed.
						// Check whether we can just draw on top of the existing cache.
						const newLeaves = [];

						let minNewZIndex: number|null = null;

						for (let i = 0; i < leavesByIds.length; i++) {
							const leaf = leavesByIds[i];
							const content = leaf.getContent()!;

							const zIndex = content.getZIndex();
							if (i >= this.renderedIds.length || leaf.getId() !== this.renderedIds[i]) {
								newLeaves.push(leaf);

								if (minNewZIndex === null || zIndex < minNewZIndex) {
									minNewZIndex = zIndex;
								}
							}
						}

						if (minNewZIndex !== null && minNewZIndex > this.renderedMaxZIndex!) {
							fullRerenderNeeded = false;
							thisRenderer = this.cachedRenderer.startRender();

							// Looping is faster than re-sorting.
							for (let i = 0; i < leaves.length; i++) {
								const leaf = leaves[i];
								const zIndex = leaf.getContent()!.getZIndex();

								if (zIndex > this.renderedMaxZIndex) {
									leaf.render(thisRenderer, this.region);
									this.renderedMaxZIndex = zIndex;
								}
							}

							if (debugMode) {
								screenRenderer.drawRect(this.region, viewport.getSizeOfPixelOnCanvas(), { fill: Color4.clay });
							}
						}
					}

					if (fullRerenderNeeded) {
						thisRenderer = this.cachedRenderer.startRender();
						thisRenderer.clear();

						this.renderedMaxZIndex = null;
						for (const leaf of leaves) {
							const content = leaf.getContent()!;
							this.renderedMaxZIndex ??= content.getZIndex();
							this.renderedMaxZIndex = Math.max(this.renderedMaxZIndex, content.getZIndex());
		
							leaf.render(thisRenderer, this.region);
						}

						if (debugMode) {
							screenRenderer.drawRect(this.region, viewport.getSizeOfPixelOnCanvas(), { fill: Color4.red });
						}
					}
					this.renderedIds = leafIds;
				} else {
					this.cachedRenderer?.dealloc();

					// Slightly increase the clip region to prevent seams.
					// Divide by two because grownBy expands the rectangle on all sides.
					const pixelSize = viewport.getSizeOfPixelOnCanvas();
					const expandedRegion = new Rect2(
						this.region.x, this.region.y,
						this.region.w + pixelSize, this.region.h + pixelSize
					);

					const clip = true;
					screenRenderer.startObject(expandedRegion, clip);
					for (const leaf of leaves) {
						leaf.render(screenRenderer, this.region.intersection(viewport.visibleRect)!);
					}

					screenRenderer.endObject();
				}
			} else {
				thisRenderer = this.cachedRenderer!.startRender();
			}

			if (thisRenderer) {
				const transformMat = this.cachedRenderer!.getTransform(this.region).inverse();
				screenRenderer.renderFromOtherOfSameType(transformMat, thisRenderer);
			}

			// Can we clean up this' children? (Are they unused?)
			if (this.instantiatedChildren.every(child => child.isEmpty())) {
				this.instantiatedChildren = [];
			}
		}

		this.checkRep();
	}

	// Returns true iff this/its children have no cached state.
	private isEmpty(): boolean {
		if (this.cachedRenderer !== null) {
			return false;
		}

		return this.instantiatedChildren.every(child => child.isEmpty());
	}

	private onRegionDealloc() {
		this.cachedRenderer = null;
		if (this.isEmpty()) {
			this.instantiatedChildren = [];
		}
	}

	private checkRep() {
		if (this.instantiatedChildren.length !== cacheDivisionSize * cacheDivisionSize && this.instantiatedChildren.length !== 0) {
			throw new Error(`Repcheck: Wrong number of children. Got ${this.instantiatedChildren.length}`);
		}

		if (this.renderedIds[1] !== undefined && this.renderedIds[0] >= this.renderedIds[1]) {
			console.error(this.renderedIds);
			throw new Error('Repcheck: First two ids are not in ascending order!');
		}

		for (const child of this.instantiatedChildren) {
			if (child.parent !== this) {
				throw new Error('Children should be linked to their parents!');
			}
		}

		if (this.cachedRenderer && !this.cachedRenderer.isAllocd()) {
			throw new Error('this\' cachedRenderer != null, but is dealloc\'d');
		}
	}
}