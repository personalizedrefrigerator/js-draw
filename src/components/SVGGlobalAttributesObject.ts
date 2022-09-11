import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
import Rect2 from '../math/Rect2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

type GlobalAttrsList = Array<[string, string|null]>;

const componentKind = 'svg-global-attributes';

// Stores global SVG attributes (e.g. namespace identifiers.)
export default class SVGGlobalAttributesObject extends AbstractComponent {
	protected contentBBox: Rect2;
	public constructor(private readonly attrs: GlobalAttrsList) {
		super(componentKind);
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

	protected serializeToString(): string | null {
		return JSON.stringify(this.attrs);
	}

	public static deserializeFromString(data: string): AbstractComponent {
		const json = JSON.parse(data) as GlobalAttrsList;
		const attrs: GlobalAttrsList = [];

		const numericAndSpaceContentExp = /^[ \t\n0-9.-eE]+$/;

		// Don't deserialize all attributes, just those that should be safe.
		for (const [ key, val ] of json) {
			if (key === 'viewBox' || key === 'width' || key === 'height') {
				if (val && numericAndSpaceContentExp.exec(val)) {
					attrs.push([key, val]);
				}
			}
		}

		return new SVGGlobalAttributesObject(attrs);
	}
}

AbstractComponent.registerComponent(componentKind, SVGGlobalAttributesObject.deserializeFromString);
