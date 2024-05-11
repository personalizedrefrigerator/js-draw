import { Vec2 } from '@js-draw/math';
import DummyRenderer from '../renderers/DummyRenderer';
import createEditor from '../../testing/createEditor';
import AbstractRenderer from '../renderers/AbstractRenderer';
import RenderingCache from './RenderingCache';
import { CacheProps } from './types';

type RenderAllocCallback = (renderer: DummyRenderer) => void;

// Override any default test options with [cacheOptions]
export const createCache = (
	onRenderAlloc?: RenderAllocCallback,
	cacheOptions?: Partial<CacheProps>,
) => {
	const editor = createEditor();

	const cache = new RenderingCache({
		createRenderer() {
			const renderer = new DummyRenderer(editor.viewport);
			onRenderAlloc?.(renderer);
			return renderer;
		},
		isOfCorrectType(renderer: AbstractRenderer) {
			return renderer instanceof DummyRenderer;
		},
		blockResolution: Vec2.of(500, 500),
		cacheSize: 500 * 10 * 4,
		maxScale: 2,
		minProportionalRenderTimePerCache: 0,
		minProportionalRenderTimeToUseCache: 0,
		...cacheOptions,
	});

	return {
		cache,
		editor,
	};
};
