import Color4 from '../Color4';
import Path from '../math/Path';
import { Vec2 } from '../math/Vec2';
import Stroke from './Stroke';
import createEditor from '../testing/createEditor';
import Mat33 from '../math/Mat33';
import EditorImage from '../EditorImage';
import AbstractComponent from './AbstractComponent';
import { DummyRenderer, SerializableCommand } from '../lib';

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
		const deserialized = Stroke.deserializeFromJSON(`[
			{
				"style": { "fill": "#f00" },
				"path": "m0,0 l10,10z"
			}
		]`);
		const path = deserialized.getPath();

		// Should cache the original string representation.
		expect(deserialized.getPath().toString()).toBe('m0,0 l10,10z');
		path['cachedStringVersion'] = null;
		expect(deserialized.getPath().toString()).toBe('M0,0L10,10L0,0');
	});

	it('strokes should load from just-serialized JSON data', () => {
		const deserialized = Stroke.deserializeFromJSON(`[
			{
				"style": { "fill": "#f00" },
				"path": "m0,0 l10,10z"
			}
		]`);

		const redeserialized = AbstractComponent.deserialize(deserialized.serialize()) as Stroke;
		expect(redeserialized.getPath().toString()).toBe(deserialized.getPath().toString());
		expect(redeserialized.getStyle().color).objEq(deserialized.getStyle().color!);
	});

	it('strokes should be restylable', () => {
		const stroke = Stroke.deserializeFromJSON(`[
			{
				"style": { "fill": "#f00" },
				"path": "m0,0 l10,10z"
			},
			{
				"style": { "fill": "#f00" },
				"path": "m10,10 l100,10z"
			}
		]`);

		expect(stroke.getStyle().color).objEq(Color4.fromHex('#f00'));

		// Should restyle even if no editor
		stroke.forceStyle({
			color: Color4.fromHex('#0f0')
		}, null);

		expect(stroke.getStyle().color).objEq(Color4.fromHex('#0f0'));

		const editor = createEditor();
		EditorImage.addElement(stroke).apply(editor);

		// Re-rendering should render with the new color
		const renderer = new DummyRenderer(editor.viewport);
		stroke.render(renderer);
		expect(renderer.lastFillStyle!.fill).toBe(stroke.getStyle().color);

		// Calling updateStyle should have similar results.
		const updateStyleCommand = stroke.updateStyle({
			color: Color4.fromHex('#00f'),
		});
		expect(stroke.getStyle().color).objEq(Color4.fromHex('#0f0'));

		updateStyleCommand.apply(editor);
		expect(editor.isRerenderQueued()).toBe(true);

		// Should do and undo correclty
		expect(stroke.getStyle().color).objEq(Color4.fromHex('#00f'));
		updateStyleCommand.unapply(editor);
		expect(stroke.getStyle().color).objEq(Color4.fromHex('#0f0'));

		// As should a deserialized updateStyle.
		const deserializedUpdateStyle = SerializableCommand.deserialize(updateStyleCommand.serialize(), editor);
		deserializedUpdateStyle.apply(editor);

		expect(stroke.getStyle().color).objEq(Color4.fromHex('#00f'));
		updateStyleCommand.unapply(editor);
		expect(stroke.getStyle().color).objEq(Color4.fromHex('#0f0'));
	});
});
