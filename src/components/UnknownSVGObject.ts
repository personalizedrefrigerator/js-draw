import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
import Rect2 from '../math/Rect2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

const componentId = 'unknown-svg-object';
export default class UnknownSVGObject extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor(private svgObject: SVGElement) {
		super(componentId);
		this.contentBBox = Rect2.of(svgObject.getBoundingClientRect());
	}

	public render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		if (!(canvas instanceof SVGRenderer)) {
			// Don't draw unrenderable objects if we can't
			return;
		}

		canvas.drawSVGElem(this.svgObject);
	}

	public intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.getEdges().some(edge => edge.intersection(lineSegment) !== null);
	}

	protected applyTransformation(_affineTransfm: Mat33): void {
	}

	protected createClone(): AbstractComponent {
		return new UnknownSVGObject(this.svgObject.cloneNode(true) as SVGElement);
	}

	public description(localization: ImageComponentLocalization): string {
		return localization.svgObject;
	}

	protected serializeToString(): string | null {
		return JSON.stringify({
			html: this.svgObject.outerHTML,
		});
	}
}

// null: Do not deserialize UnknownSVGObjects.
AbstractComponent.registerComponent(componentId, null);
