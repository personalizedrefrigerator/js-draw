import { Vec2 } from '../../math/Vec2';
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
    minProportionalRenderTimePerCache: number;

    // Minimum number of strokes/etc. to use the cache to render, isntead of
    // rendering directly.
    minProportionalRenderTimeToUseCache: number;
}

export interface CacheState {
    currentRenderingCycle: number;
    props: CacheProps;
    recordManager: CacheRecordManager;
}
