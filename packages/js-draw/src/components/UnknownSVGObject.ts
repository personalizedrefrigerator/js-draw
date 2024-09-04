//
// Stores objects loaded from an SVG that aren't recognised by the editor.
// @internal
// @packageDocumentation
//

import { LineSegment2, Mat33, Rect2 } from '@js-draw/math';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import AbstractComponent, { ComponentSizingMode } from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

const componentId = 'unknown-svg-object';
export default class UnknownSVGObject extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor(private svgObject: SVGElement) {
		super(componentId);
		this.contentBBox = Rect2.of(svgObject.getBoundingClientRect());
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		if (!(canvas instanceof SVGRenderer)) {
			// Don't draw unrenderable objects if we can't
			return;
		}

		canvas.startObject(this.contentBBox);
		canvas.drawSVGElem(this.svgObject);
		canvas.endObject(this.getLoadSaveData());
	}

	public override intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.getEdges().some((edge) => edge.intersection(lineSegment) !== null);
	}

	protected applyTransformation(_affineTransfm: Mat33): void {}

	public override isSelectable() {
		return false;
	}

	public override getSizingMode() {
		// This component can be shown anywhere (it won't be
		// visible to the user, it just needs to be saved with
		// the image).
		return ComponentSizingMode.Anywhere;
	}

	protected createClone(): AbstractComponent {
		return new UnknownSVGObject(this.svgObject.cloneNode(true) as SVGElement);
	}

	public description(localization: ImageComponentLocalization): string {
		return localization.svgObject;
	}

	protected serializeToJSON(): string | null {
		return JSON.stringify({
			html: this.svgObject.outerHTML,
		});
	}
}

// null: Do not deserialize UnknownSVGObjects.
AbstractComponent.registerComponent(componentId, null);
