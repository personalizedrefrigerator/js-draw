//
// Used by `SVGLoader`s to store unrecognised global attributes
// (e.g. unrecognised XML namespace declarations).
// @internal
// @packageDocumentation
//

import { LineSegment2, Mat33, Rect2 } from '@js-draw/math';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import AbstractComponent, { ComponentSizingMode } from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

type GlobalAttrsList = Array<[string, string|null]>;

const componentKind = 'svg-global-attributes';

// Stores global SVG attributes (e.g. namespace identifiers.)
export default class SVGGlobalAttributesObject extends AbstractComponent {
	protected contentBBox: Rect2;
	private readonly attrs: GlobalAttrsList;

	// Does not modify `attrs`
	public constructor(attrs: GlobalAttrsList) {
		super(componentKind);
		this.contentBBox = Rect2.empty;

		// Already stored/managed in `editor.image`.
		const attrsManagedByRenderer = [ 'viewBox', 'width', 'height' ];

		// Only store attributes that aren't managed by other parts of the app.
		this.attrs = attrs.filter(([attr, _value]) => {
			return !attrsManagedByRenderer.includes(attr);
		});
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

	public override isSelectable() {
		return false;
	}

	public override getSizingMode() {
		// This component can be shown anywhere (it won't be
		// visible to the user, it just needs to be saved with
		// the image).
		return ComponentSizingMode.Anywhere;
	}

	protected createClone() {
		return new SVGGlobalAttributesObject(this.attrs);
	}

	public description(localization: ImageComponentLocalization): string {
		return localization.svgObject;
	}

	protected serializeToJSON(): string | null {
		return JSON.stringify(this.attrs);
	}

	public static deserializeFromString(this: void, _data: string): AbstractComponent {
		// To be safe, don't deserialize any attributes
		return new SVGGlobalAttributesObject([]);
	}
}

AbstractComponent.registerComponent(componentKind, SVGGlobalAttributesObject.deserializeFromString);
