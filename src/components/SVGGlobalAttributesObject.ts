import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

// Stores global SVG attributes (e.g. namespace identifiers.)
export default class SVGGlobalAttributesObject extends AbstractComponent {
	protected contentBBox: Rect2;
	public constructor(private readonly attrs: Array<[string, string|null]>) {
		super();
		this.contentBBox = Rect2.empty;
	}

	public render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		if (!(canvas instanceof SVGRenderer)) {
			// Don't draw unrenderable objects if we can't
			return;
		}

		for (const [ attr, value ] of this.attrs) {
			canvas.setRootSVGAttribute(attr, value);
		}
	}

	public intersects(_lineSegment: LineSegment2): boolean {
		return false;
	}

	protected applyTransformation(_affineTransfm: Mat33): void {
	}

	protected createClone() {
		return new SVGGlobalAttributesObject(this.attrs);
	}

	public description(localization: ImageComponentLocalization): string {
		return localization.svgObject;
	}
}
