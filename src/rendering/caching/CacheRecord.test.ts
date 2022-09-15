/* @jest-environment jsdom */

import Rect2 from '../../math/Rect2';
import { Vec2 } from '../../math/Vec2';
import CacheRecord from './CacheRecord';
import { createCache } from './testUtils';

describe('CacheRecord', () => {
	describe('should map points in the cache renderer\'s region to the cache renderer', () => {
		const blockResolution = Vec2.of(500, 500);
		const { cache } = createCache(undefined, {
			blockResolution,
		});
		const state = cache['sharedState'];

		const record = new CacheRecord(() => {}, state);

		describe('region has top left at (0, 0)', () => {
			it('region as big as the cache block', () => {
				const transform = record.getTransform(
					new Rect2(0, 0, 500, 500)
				);
				expect(transform.transformVec2(Vec2.unitX)).toMatchObject(Vec2.unitX);
				expect(transform.transformVec2(Vec2.unitY)).toMatchObject(Vec2.unitY);
			});

			it('region twice as big as cache block', () => {
				const transform = record.getTransform(
					new Rect2(0, 0, 1000, 1000)
				);

				// A size-one vector on the screen corresponds to a size 1/2 vector on the
				// cached surface.
				expect(transform.transformVec2(Vec2.unitX)).toMatchObject(Vec2.of(0.5, 0));
				expect(transform.transformVec2(Vec2.unitY)).toMatchObject(Vec2.of(0, 0.5));
			});
		});

		describe('region has top left at (100, 100)', () => {
			it('region as big as the cache block', () => {
				const transform = record.getTransform(
					new Rect2(100, 100, 500, 500)
				);
				expect(transform.transformVec2(Vec2.of(100, 100))).toMatchObject(Vec2.zero);
				expect(transform.transformVec2(Vec2.of(500, 500))).toMatchObject(Vec2.of(400, 400));
			});
		});
	});
});