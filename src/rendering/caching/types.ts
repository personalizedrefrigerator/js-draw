import { Vec2 } from '../../geometry/Vec2';
import AbstractRenderer from '../renderers/AbstractRenderer';
import { CacheRecordManager } from './CacheRecordManager';


export type CacheAddress = number;
export type BeforeDeallocCallback = ()=>void;


export interface CacheProps {
    createRenderer(): AbstractRenderer;
    // Returns whether the cache can be rendered onto [renderer].
    isOfCorrectType(renderer: AbstractRenderer): boolean;

    blockResolution: Vec2;
    cacheSize: number;

    // Maximum amount a cached image can be scaled without a re-render
    // (larger numbers = blurrier, but faster)
    maxScale: number;

    // Minimum component count to cache, rather than just re-render each time.
    minComponentsPerCache: number;

    // Minimum number of strokes/etc. to use the cache to render, isntead of
    // rendering directly.
    minComponentsToUseCache: number;
}

// CacheRecordManager relies on a partial copy of the shared state. Thus,
// we need to separate partial/non-partial state.
export interface PartialCacheState {
    currentRenderingCycle: number;
    props: CacheProps;
}

export interface CacheState extends PartialCacheState {
    recordManager: CacheRecordManager;
}
