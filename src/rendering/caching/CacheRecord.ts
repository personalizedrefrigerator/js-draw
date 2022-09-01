import Mat33 from '../../geometry/Mat33';
import Rect2 from '../../geometry/Rect2';
import AbstractRenderer from '../renderers/AbstractRenderer';
import { BeforeDeallocCallback, CacheState } from './types';

// Represents a cached renderer/canvas
// This is not a [CacheNode] -- it handles cached renderers and does not have sub-renderers.

export default class CacheRecord {
	private renderer: AbstractRenderer;
	private lastUsedCycle: number;
	private allocd: boolean = false;

	public constructor(
		private onBeforeDeallocCallback: BeforeDeallocCallback|null,
		private cacheState: CacheState,
	) {
		this.renderer = cacheState.props.createRenderer();
		this.lastUsedCycle = -1;
		this.allocd = true;
	}

	public startRender(): AbstractRenderer {
		this.lastUsedCycle = this.cacheState.currentRenderingCycle++;
		if (!this.allocd) {
			throw new Error('Only alloc\'d canvases can be rendered to');
		}
		return this.renderer;
	}

	public dealloc() {
		this.onBeforeDeallocCallback?.();
		this.allocd = false;
		this.onBeforeDeallocCallback = null;
		this.lastUsedCycle = 0;
	}

	public isAllocd() {
		return this.allocd;
	}

	public realloc(newDeallocCallback: BeforeDeallocCallback) {
		if (this.allocd) {
			this.dealloc();
		}
		this.allocd = true;
		this.onBeforeDeallocCallback = newDeallocCallback;
	}

	public getLastUsedCycle(): number {
		return this.lastUsedCycle;
	}

	// Returns the transformation that maps [drawTo] to this' renderable region
	// (i.e. a [cacheProps.blockResolution]-sized rectangle with top left at (0, 0))
	public getTransform(drawTo: Rect2): Mat33 {
		const transform = Mat33.scaling2D(
			this.cacheState.props.blockResolution.x / drawTo.size.x
		).rightMul(
			Mat33.translation(drawTo.topLeft.times(-1))
		);

		return transform;
	}

	public setRenderingRegion(drawTo: Rect2) {
		this.renderer.setTransform(
			// Invert to map objects instead of the viewport
			this.getTransform(drawTo)
		);
	}
}