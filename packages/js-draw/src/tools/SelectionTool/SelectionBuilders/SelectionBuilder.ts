import { Color4, Path, Point2 } from '@js-draw/math';
import AbstractRenderer from '../../../rendering/renderers/AbstractRenderer';
import EditorImage from '../../../image/EditorImage';
import AbstractComponent from '../../../components/AbstractComponent';
import { pathToRenderable } from '../../../lib';

export default abstract class SelectionBuilder {
	public abstract onPointerMove(canvasPoint: Point2): void;
	public abstract previewPath(): Path;
	protected abstract resolveInternal(image: EditorImage): AbstractComponent[];

	/** Renders a preview of the selection bounds */
	public render(renderer: AbstractRenderer, color: Color4) {
		renderer.drawPath(pathToRenderable(this.previewPath(), { fill: color }));
	}

	/** Converts the selection preview into a set of selected elements */
	public resolve(image: EditorImage, minSize: number) {
		const path = this.previewPath();

		const filterComponents = (components: AbstractComponent[]) => {
			return components.filter((component) => {
				return component.isSelectable();
			});
		};

		let components;
		if (path.bbox.maxDimension <= minSize) {
			// Single-item selection mode
			const minSizeBox = path.bbox.grownBy(minSize);

			components = image.getElementsIntersectingRegion(minSizeBox);
			components = filterComponents(components);

			if (components.length > 1) {
				components = [components[0]];
			}
		} else {
			components = filterComponents(this.resolveInternal(image));
		}

		return components;
	}
}
