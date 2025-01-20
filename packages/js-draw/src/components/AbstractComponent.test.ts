import { Color4, EditorImage, Mat33, Path, Rect2, Vec2 } from '../lib';
import { pathToRenderable } from '../rendering/RenderablePathSpec';
import createEditor from '../testing/createEditor';
import Stroke from './Stroke';

describe('AbstractComponent', () => {
	it(".transformBy should restore the component's z-index on undo", () => {
		const editor = createEditor();
		const component = new Stroke([
			pathToRenderable(Path.fromRect(Rect2.unitSquare), { fill: Color4.red }),
		]);
		EditorImage.addElement(component).apply(editor);

		const origZIndex = component.getZIndex();

		const transformCommand = component.transformBy(Mat33.translation(Vec2.unitX));
		transformCommand.apply(editor);

		// Should increase the z-index on applying a transform
		expect(component.getZIndex()).toBeGreaterThan(origZIndex);

		transformCommand.unapply(editor);
		expect(component.getZIndex()).toBe(origZIndex);
	});

	it('.withTopLeft should return a copy of the component with a new top left', () => {
		const stroke = new Stroke([
			pathToRenderable(Path.fromRect(Rect2.unitSquare), { fill: Color4.red }),
		]);
		expect(stroke.getExactBBox()).objEq(Rect2.unitSquare);
		expect(stroke.getBBox()).objEq(Rect2.unitSquare);

		const clone = stroke.withTopLeft(Vec2.unitX);
		expect(clone.getBBox()).objEq(Rect2.fromCorners(Vec2.unitX, Vec2.of(2, 1)));
		// Should not have changed the original
		expect(stroke.getBBox()).objEq(Rect2.unitSquare);
	});
});
