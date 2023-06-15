import Color4 from '../../Color4';
import Viewport from '../../Viewport';
import { Vec2 } from '../../math/Vec2';
import { StrokeDataPoint } from '../../types';
import { makeFreehandLineBuilder } from './FreehandLineBuilder';

describe('FreehandLineBuilder', () => {
	it('should create a dot on click', () => {
		const viewport = new Viewport(() => {});
		const startPoint: StrokeDataPoint = {
			pos: Vec2.zero,
			width: 1,
			time: (new Date()).getTime(),
			color: Color4.red,
		};
		const lineBuilder = makeFreehandLineBuilder(startPoint, viewport);

		const component = lineBuilder.build();
		const bbox = component.getBBox();

		expect(bbox.area).toBeGreaterThan(0);
		expect(bbox.width).toBeGreaterThan(0.5);
		expect(bbox.height).toBeGreaterThan(0.5);
	});
});
