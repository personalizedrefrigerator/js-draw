/* @jest-environment jsdom */

import Color4 from '../Color4';
import Path from '../geometry/Path';
import { Vec2 } from '../geometry/Vec2';
import Stroke from './Stroke';
import { loadExpectExtensions } from '../testing/loadExpectExtensions';
import createEditor from '../testing/createEditor';
import Mat33 from '../geometry/Mat33';

loadExpectExtensions();

describe('Stroke', () => {
	it('empty stroke should have an empty bounding box', () => {
		const stroke = new Stroke([{
			startPoint: Vec2.zero,
			commands: [],
			style: {
				fill: Color4.blue,
			},
		}]);
		expect(stroke.getBBox()).toMatchObject({
			x: 0, y: 0, w: 0, h: 0,
		});
	});

	it('cloned strokes should have the same points', () => {
		const stroke = new Stroke([
			Path.fromString('m1,1 2,2 3,3 z').toRenderable({ fill: Color4.red })
		]);
		const clone = stroke.clone();

		expect(
			(clone as Stroke).getPath().toString()
		).toBe(
			stroke.getPath().toString()
		);
	});

	it('transforming a cloned stroke should not affect the original', () => {
		const editor = createEditor();
		const stroke = new Stroke([
			Path.fromString('m1,1 2,2 3,3 z').toRenderable({ fill: Color4.red })
		]);
		const origBBox = stroke.getBBox();
		expect(origBBox).toMatchObject({
			x: 1, y: 1,
			w: 5, h: 5,
		});

		const copy = stroke.clone();
		expect(copy.getBBox()).objEq(origBBox);

		stroke.transformBy(
			Mat33.scaling2D(Vec2.of(10, 10))
		).apply(editor);

		expect(stroke.getBBox()).not.objEq(origBBox);
		expect(copy.getBBox()).objEq(origBBox);
	});

	it('strokes should deserialize from JSON data', () => {
		const deserialized = Stroke.deserializeFromString(`[
			{
				"style": { "fill": "#f00" },
				"path": "m0,0 l10,10z"
			}
		]`);
		expect(deserialized.getPath().toString()).toBe('M0,0L10,10L0,0');
	});
});
