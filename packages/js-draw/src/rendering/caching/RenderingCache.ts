import { ImageNode } from '../../image/EditorImage';
import { Rect2 } from '@js-draw/math';
import Viewport from '../../Viewport';
import AbstractRenderer from '../renderers/AbstractRenderer';
import RenderingCacheNode from './RenderingCacheNode';
import { CacheRecordManager } from './CacheRecordManager';
import { CacheProps, CacheState } from './types';

export default class RenderingCache {
	private sharedState: CacheState;
	private recordManager: CacheRecordManager;
	private rootNode: RenderingCacheNode|null;

	public constructor(cacheProps: CacheProps) {
		this.recordManager = new CacheRecordManager(cacheProps);
		this.sharedState = {
			props: cacheProps,
			currentRenderingCycle: 0,
			recordManager: this.recordManager,
			debugMode: false,
		};
		this.recordManager.setSharedState(this.sharedState);
	}

	public render(screenRenderer: AbstractRenderer, image: ImageNode, viewport: Viewport) {
		const visibleRect = viewport.visibleRect;
		this.sharedState.currentRenderingCycle ++;

		// If we can't use the cache,
		if (!this.sharedState.props.isOfCorrectType(screenRenderer)) {
			image.render(screenRenderer, visibleRect);
			return;
		}

		if (!this.rootNode) {
			// Adjust the node so that it has the correct aspect ratio
			const res = this.sharedState.props.blockResolution;

			const topLeft = visibleRect.topLeft;
			this.rootNode = new RenderingCacheNode(
				new Rect2(topLeft.x, topLeft.y, res.x, res.y),
				this.sharedState
			);
		}

		while (!this.rootNode.region.containsRect(visibleRect)) {
			this.rootNode = this.rootNode.generateParent();
		}

		this.rootNode = this.rootNode.smallestChildContaining(visibleRect) ?? this.rootNode;

		const visibleLeaves = image.getLeavesIntersectingRegion(
			viewport.visibleRect, rect => screenRenderer.isTooSmallToRender(rect)
		);

		let approxVisibleRenderTime = 0;
		for (const leaf of visibleLeaves) {
			approxVisibleRenderTime += leaf.getContent()!.getProportionalRenderingTime();
		}

		if (approxVisibleRenderTime > this.sharedState.props.minProportionalRenderTimeToUseCache) {
			this.rootNode.renderItems(screenRenderer, [ image ], viewport);
		} else {
			image.render(screenRenderer, visibleRect);
		}
	}

	public getDebugInfo() {
		return this.recordManager.getDebugInfo();
	}

	public setIsDebugMode(debugMode: boolean) {
		this.sharedState.debugMode = debugMode;
	}
}