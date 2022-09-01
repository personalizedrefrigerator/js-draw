import { ImageNode } from '../../EditorImage';
import Rect2 from '../../geometry/Rect2';
import Viewport from '../../Viewport';
import AbstractRenderer from '../renderers/AbstractRenderer';
import RenderingCacheNode from './RenderingCacheNode';
import { CacheRecordManager } from './CacheRecordManager';
import { CacheProps, CacheState, PartialCacheState } from './types';

export default class RenderingCache {
	private partialSharedState: PartialCacheState;
	private recordManager: CacheRecordManager;
	private rootNode: RenderingCacheNode|null;

	public constructor(cacheProps: CacheProps) {
		this.partialSharedState = {
			props: cacheProps,
			currentRenderingCycle: 0,
		};
		this.recordManager = new CacheRecordManager(this.partialSharedState);
	}

	public getSharedState(): CacheState {
		return {
			...this.partialSharedState,
			recordManager: this.recordManager,
		};
	}

	public render(screenRenderer: AbstractRenderer, image: ImageNode, viewport: Viewport) {
		const visibleRect = viewport.visibleRect;
		this.partialSharedState.currentRenderingCycle ++;

		// If we can't use the cache,
		if (!this.partialSharedState.props.isOfCorrectType(screenRenderer)) {
			image.render(screenRenderer, visibleRect);
			return;
		}

		if (!this.rootNode) {
			// Adjust the node so that it has the correct aspect ratio
			const res = this.partialSharedState.props.blockResolution;

			const topLeft = visibleRect.topLeft;
			this.rootNode = new RenderingCacheNode(
				new Rect2(topLeft.x, topLeft.y, res.x, res.y),
				this.getSharedState()
			);
		}

		while (!this.rootNode!.region.containsRect(visibleRect)) {
			this.rootNode = this.rootNode!.generateParent();
		}

		this.rootNode = this.rootNode!.smallestChildContaining(visibleRect) ?? this.rootNode;

		const visibleLeaves = image.getLeavesIntersectingRegion(viewport.visibleRect, rect => screenRenderer.isTooSmallToRender(rect));
		if (visibleLeaves.length > this.partialSharedState.props.minComponentsToUseCache) {
			this.rootNode!.renderItems(screenRenderer, [ image ], viewport);
		} else {
			image.render(screenRenderer, visibleRect);
		}
	}
}