import { Color4 } from '@js-draw/math';
import RenderingStyle, { styleFromJSON, stylesEqual, styleToJSON } from './RenderingStyle';

describe('RenderingStyle', () => {
	it('identical styles should be equal', () => {
		const redFill: RenderingStyle = {
			fill: Color4.red,
		};
		expect(stylesEqual(redFill, redFill)).toBe(true);
		expect(stylesEqual({ fill: Color4.ofRGB(1, 0, 0.3) }, { fill: Color4.ofRGB(1, 0, 0.3) })).toBe(
			true,
		);
		expect(stylesEqual({ fill: Color4.red }, { fill: Color4.blue })).toBe(false);

		expect(
			stylesEqual(
				{ fill: Color4.red, stroke: { width: 1, color: Color4.red } },
				{ fill: Color4.red },
			),
		).toBe(false);
		expect(
			stylesEqual(
				{ fill: Color4.red, stroke: { width: 1, color: Color4.red } },
				{ fill: Color4.red, stroke: { width: 1, color: Color4.blue } },
			),
		).toBe(false);
		expect(
			stylesEqual(
				{ fill: Color4.red, stroke: { width: 1, color: Color4.red } },
				{ fill: Color4.red, stroke: { width: 1, color: Color4.red } },
			),
		).toBe(true);
		expect(
			stylesEqual(
				{ fill: Color4.red, stroke: { width: 1, color: Color4.red } },
				{ fill: Color4.red, stroke: { width: 2, color: Color4.red } },
			),
		).toBe(false);
	});

	it('styles should be convertable to JSON', () => {
		expect(
			styleToJSON({
				fill: Color4.red,
			}),
		).toMatchObject({
			fill: '#ff0000',
			stroke: undefined,
		});

		expect(
			styleToJSON({
				fill: Color4.blue,
				stroke: {
					width: 4,
					color: Color4.red,
				},
			}),
		).toMatchObject({
			fill: '#0000ff',
			stroke: {
				width: 4,
				color: '#ff0000',
			},
		});
	});

	it('JSON should be convertable into styles', () => {
		const redFillJSON = { fill: '#ff0000' };
		const redFillBlueStrokeJSON = { fill: '#ff0000', stroke: { width: 4, color: '#0000ff' } };
		expect(styleToJSON(styleFromJSON(redFillJSON))).toMatchObject(redFillJSON);
		expect(styleToJSON(styleFromJSON(redFillBlueStrokeJSON))).toMatchObject(redFillBlueStrokeJSON);
	});
});
