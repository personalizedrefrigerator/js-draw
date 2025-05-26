import { Color4, EditorImage, Mat33, Path, Rect2, Vec2 } from '../lib';
import { pathToRenderable } from '../rendering/RenderablePathSpec';
import createEditor from '../testing/createEditor';
import Stroke from './Stroke';

describe('AbstractComponent.transformBy', () => {
	it("should restore the component's z-index on undo", () => {
		const editor = createEditor();
		const component = new Stroke([
			pathToRenderable(Path.fromRect(Rect2.unitSquare), { fill: Color4.red }),
		]);
		EditorImage.addComponent(component).apply(editor);

		const origZIndex = component.getZIndex();

		const transformCommand = component.transformBy(Mat33.translation(Vec2.unitX));
		transformCommand.apply(editor);

		// Should increase the z-index on applying a transform
		expect(component.getZIndex()).toBeGreaterThan(origZIndex);

		transformCommand.unapply(editor);
		expect(component.getZIndex()).toBe(origZIndex);
	});
});
