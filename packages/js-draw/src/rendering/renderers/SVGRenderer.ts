import { LoadSaveDataTable } from '../../components/AbstractComponent';
import { Mat33, Rect2, Point2, Vec2, toRoundedString } from '@js-draw/math';
import { svgAttributesDataKey, svgLoaderAttributeContainerID, SVGLoaderUnknownAttribute, SVGLoaderUnknownStyleAttribute, svgStyleAttributesDataKey } from '../../SVGLoader';
import Viewport from '../../Viewport';
import RenderingStyle, { stylesEqual } from '../RenderingStyle';
import TextRenderingStyle from '../TextRenderingStyle';
import AbstractRenderer, { RenderableImage } from './AbstractRenderer';
import RenderablePathSpec, { pathFromRenderable } from '../RenderablePathSpec';
import listPrefixMatch from '../../util/listPrefixMatch';

export const renderedStylesheetId = 'js-draw-style-sheet';

const svgNameSpace = 'http://www.w3.org/2000/svg';

const defaultTextStyle: Partial<TextRenderingStyle> = {
	fontWeight: '400',
	fontStyle: 'normal',
};

type FromViewportOptions = {
	sanitize?: boolean;

	/**
	 * Rather than having the top left of the `viewBox` set to (0, 0),
	 * if `useViewBoxForPositioning` is `true`, the `viewBox`'s top left
	 * is based on the top left of the rendering viewport's `visibleRect`.
	 */
	useViewBoxForPositioning?: boolean;
};

/**
 * Renders onto an `SVGElement`.
 *
 * @see {@link Editor.toSVG}
 */
export default class SVGRenderer extends AbstractRenderer {
	private lastPathStyle: RenderingStyle|null = null;
	private lastPathString: string[] = [];
	private lastContainerIDList: string[] = [];

	// Elements that make up the current object (as created by startObject)
	// if any.
	private objectElems: SVGElement[]|null = null;

	private overwrittenAttrs: Record<string, string|null> = {};

	/**
	 * Creates a renderer that renders onto `elem`. If `sanitize`, don't render potentially untrusted data.
	 *
	 * `viewport` is used to determine the translation/rotation/scaling/output size of the rendered
	 * data.
	 */
	public constructor(private elem: SVGSVGElement, viewport: Viewport, private sanitize: boolean = false) {
		super(viewport);
		this.clear();

		this.addStyleSheet();
	}

	private addStyleSheet() {
		if (!this.elem.querySelector(`#${renderedStylesheetId}`)) {
			// Default to rounded strokes.
			const styleSheet = document.createElementNS('http://www.w3.org/2000/svg', 'style');
			styleSheet.innerHTML = `
				path {
					stroke-linecap: round;
					stroke-linejoin: round;
				}

				text {
					white-space: pre;
				}
			`.replace(/\s+/g, '');
			styleSheet.setAttribute('id', renderedStylesheetId);
			this.elem.appendChild(styleSheet);
		}
	}

	// Sets an attribute on the root SVG element.
	public setRootSVGAttribute(name: string, value: string|null) {
		if (this.sanitize) {
			return;
		}

		// Make the original value of the attribute restorable on clear
		if (!(name in this.overwrittenAttrs)) {
			this.overwrittenAttrs[name] = this.elem.getAttribute(name);
		}

		if (value !== null) {
			this.elem.setAttribute(name, value);
		} else {
			this.elem.removeAttribute(name);
		}
	}

	public displaySize(): Vec2 {
		return Vec2.of(this.elem.clientWidth, this.elem.clientHeight);
	}

	public clear() {
		this.lastPathString = [];
		this.lastContainerIDList = [];

		if (!this.sanitize) {
			// Restore all all attributes
			for (const attrName in this.overwrittenAttrs) {
				const value = this.overwrittenAttrs[attrName];

				if (value) {
					this.elem.setAttribute(attrName, value);
				} else {
					this.elem.removeAttribute(attrName);
				}
			}
			this.overwrittenAttrs = {};
		}
	}

	// Push `this.fullPath` to the SVG. Returns the path added to the SVG, if any.
	// @internal
	protected addPathToSVG() {
		if (!this.lastPathStyle || this.lastPathString.length === 0) {
			return null;
		}

		const pathElem = document.createElementNS(svgNameSpace, 'path');
		pathElem.setAttribute('d', this.lastPathString.join(' '));

		const style = this.lastPathStyle;
		if (style.fill.a > 0) {
			pathElem.setAttribute('fill', style.fill.toHexString());
		} else {
			pathElem.setAttribute('fill', 'none');
		}

		if (style.stroke) {
			pathElem.setAttribute('stroke', style.stroke.color.toHexString());
			pathElem.setAttribute('stroke-width', toRoundedString(style.stroke.width));
		}

		this.elem.appendChild(pathElem);
		this.objectElems?.push(pathElem);

		return pathElem;
	}

	public override drawPath(pathSpec: RenderablePathSpec) {
		const style = pathSpec.style;
		const path = pathFromRenderable(pathSpec).transformedBy(this.getCanvasToScreenTransform());

		// Try to extend the previous path, if possible
		if (
			this.lastPathString.length === 0 || !this.lastPathStyle || !stylesEqual(this.lastPathStyle, style)
		) {
			this.addPathToSVG();
			this.lastPathStyle = style;
			this.lastPathString = [];
		}
		this.lastPathString.push(path.toString());
	}

	// Apply [elemTransform] to [elem]. Uses both a `matrix` and `.x`, `.y` properties if `setXY` is true.
	// Otherwise, just uses a `matrix`.
	private transformFrom(elemTransform: Mat33, elem: SVGElement, inCanvasSpace: boolean = false) {
		const transform = !inCanvasSpace ? this.getCanvasToScreenTransform().rightMul(elemTransform) : elemTransform;

		if (!transform.eq(Mat33.identity)) {
			const matrixString = transform.toCSSMatrix();
			elem.style.transform = matrixString;

			// Most browsers round the components of CSS transforms.
			// Include a higher precision copy of the element's transform.
			elem.setAttribute('data-highp-transform', matrixString);
		} else {
			elem.style.transform = '';
		}
	}

	private textContainer: SVGTextElement|null = null;
	private textContainerTransform: Mat33|null = null;
	private textParentStyle: Partial<TextRenderingStyle>|null = defaultTextStyle;
	public drawText(text: string, transform: Mat33, style: TextRenderingStyle): void {
		const applyTextStyles = (elem: SVGTextElement|SVGTSpanElement, style: TextRenderingStyle) => {
			if (style.fontFamily !== this.textParentStyle?.fontFamily) {
				elem.style.fontFamily = style.fontFamily;
			}
			if (style.fontVariant !== this.textParentStyle?.fontVariant) {
				elem.style.fontVariant = style.fontVariant ?? '';
			}
			if (style.fontWeight !== this.textParentStyle?.fontWeight) {
				elem.style.fontWeight = style.fontWeight ?? '';
			}
			if (style.fontStyle !== this.textParentStyle?.fontStyle) {
				elem.style.fontStyle = style.fontStyle ?? '';
			}
			if (style.size !== this.textParentStyle?.size) {
				elem.style.fontSize = style.size + 'px';
			}

			const fillString = style.renderingStyle.fill.toHexString();
			// TODO: Uncomment at some future major version release --- currently causes incompatibility due
			//       to an SVG parsing bug in older versions.
			//const parentFillString = this.textParentStyle?.renderingStyle?.fill?.toHexString();
			//if (fillString !== parentFillString) {
			elem.style.fill = fillString;
			//}

			if (style.renderingStyle.stroke) {
				const strokeStyle = style.renderingStyle.stroke;
				elem.style.stroke = strokeStyle.color.toHexString();
				elem.style.strokeWidth = strokeStyle.width + 'px';
			}
		};
		transform = this.getCanvasToScreenTransform().rightMul(transform);

		if (!this.textContainer) {
			const container = document.createElementNS(svgNameSpace, 'text');
			container.appendChild(document.createTextNode(text));

			this.transformFrom(transform, container, true);
			applyTextStyles(container, style);

			this.elem.appendChild(container);
			this.objectElems?.push(container);
			if (this.objectLevel > 0) {
				this.textContainer = container;
				this.textContainerTransform = transform;
				this.textParentStyle = { ...defaultTextStyle, ...style };
			}
		} else {
			const elem = document.createElementNS(svgNameSpace, 'tspan');
			elem.appendChild(document.createTextNode(text));
			this.textContainer.appendChild(elem);

			// Make .x/.y relative to the parent.
			transform = this.textContainerTransform!.inverse().rightMul(transform);

			// .style.transform does nothing to tspan elements. As such, we need to set x/y:
			const translation = transform.transformVec2(Vec2.zero);
			elem.setAttribute('x', `${toRoundedString(translation.x)}`);
			elem.setAttribute('y', `${toRoundedString(translation.y)}`);

			applyTextStyles(elem, style);
		}
	}

	public drawImage(image: RenderableImage) {
		let label = image.label ?? image.image.getAttribute('aria-label') ?? '';
		if (label === '') {
			label = image.image.getAttribute('alt') ?? '';
		}

		const svgImgElem = document.createElementNS(svgNameSpace, 'image');
		svgImgElem.setAttribute('href', image.base64Url);
		svgImgElem.setAttribute('width', image.image.getAttribute('width') ?? '');
		svgImgElem.setAttribute('height', image.image.getAttribute('height') ?? '');
		svgImgElem.setAttribute('aria-label', label);
		this.transformFrom(image.transform, svgImgElem);

		this.elem.appendChild(svgImgElem);
		this.objectElems?.push(svgImgElem);
	}

	public override startObject(boundingBox: Rect2) {
		super.startObject(boundingBox);

		// Only accumulate a path within an object
		this.lastPathString = [];
		this.lastPathStyle = null;
		this.textContainer = null;
		this.textParentStyle = defaultTextStyle;
		this.objectElems = [];
	}

	public override endObject(loaderData?: LoadSaveDataTable, elemClassNames?: string[]) {
		super.endObject(loaderData);

		// Don't extend paths across objects
		this.addPathToSVG();

		// If empty/not an object, stop.
		if (!this.objectElems) {
			return;
		}

		if (loaderData && !this.sanitize) {
			// Restore any attributes unsupported by the app.
			for (const elem of this.objectElems) {
				const attrs = loaderData[svgAttributesDataKey] as SVGLoaderUnknownAttribute[]|undefined;
				const styleAttrs = loaderData[svgStyleAttributesDataKey] as SVGLoaderUnknownStyleAttribute[]|undefined;

				if (attrs) {
					for (const [ attr, value ] of attrs) {
						elem.setAttribute(attr, value);
					}
				}

				if (styleAttrs) {
					for (const attr of styleAttrs) {
						elem.style.setProperty(attr.key, attr.value, attr.priority);
					}
				}
			}

			// Update the parent
			const containerIDData = loaderData[svgLoaderAttributeContainerID];
			let containerIDList: string[] = [];
			if (containerIDData && containerIDData[0]) {
				// If a string list,
				if ((containerIDData[0] as any).length) {
					containerIDList = containerIDData[0] as string[];
				}
			}

			if (
				containerIDList.length > 0
				// containerIDList must share a prefix with the last ID list
				// otherwise, the z order of elements may have been changed from
				// the original image.
				// In the case that the z order has been changed, keep the current
				// element as a child of the root to preserve z order.
				&& listPrefixMatch(this.lastContainerIDList, containerIDList)

				// The component can add at most one more parent than the previous item.
				&& this.lastContainerIDList.length >= containerIDList.length - 1
			) {
				// Select the last
				const containerID = containerIDList[containerIDList.length - 1];

				const containerCandidates = this.elem.querySelectorAll(`g#${containerID}`);
				if (containerCandidates.length >= 1) {
					const container = containerCandidates[0];

					// If this is the first time we're entering the group, the
					// group should be empty.
					// Otherwise, this may be a case that would break z-ordering.
					if (container.children.length === 0 || this.lastContainerIDList.length >= containerIDList.length) {
						// Move all objectElems to the found container
						for (const elem of this.objectElems) {
							elem.remove();
							container.appendChild(elem);
						}
					} else {
						containerIDList = [];
					}
				}
			} else {
				containerIDList = [];
			}

			this.lastContainerIDList = containerIDList;
		}

		// Add class names to the object, if given.
		if (elemClassNames && this.objectElems) {
			if (this.objectElems.length === 1) {
				this.objectElems[0].classList.add(...elemClassNames);
			} else {
				const wrapper = document.createElementNS(svgNameSpace, 'g');
				wrapper.classList.add(...elemClassNames);

				for (const elem of this.objectElems) {
					elem.remove();
					wrapper.appendChild(elem);
				}

				this.elem.appendChild(wrapper);
			}
		}
	}

	// Not implemented -- use drawPath instead.
	private unimplementedMessage() { throw new Error('Not implemenented!'); }
	protected beginPath(_startPoint: Point2) { this.unimplementedMessage(); }
	protected endPath(_style: RenderingStyle) { this.unimplementedMessage(); }
	protected lineTo(_point: Point2) { this.unimplementedMessage(); }
	protected moveTo(_point: Point2) { this.unimplementedMessage(); }
	protected traceCubicBezierCurve(
		_controlPoint1: Point2, _controlPoint2: Point2, _endPoint: Point2
	) { this.unimplementedMessage(); }
	protected traceQuadraticBezierCurve(_controlPoint: Point2, _endPoint: Point2) { this.unimplementedMessage(); }

	public drawPoints(...points: Point2[]) {
		points.map(point => {
			const elem = document.createElementNS(svgNameSpace, 'circle');
			elem.setAttribute('cx', `${point.x}`);
			elem.setAttribute('cy', `${point.y}`);
			elem.setAttribute('r', '15');
			this.elem.appendChild(elem);
		});
	}

	// Renders a **copy** of the given element.
	public drawSVGElem(elem: SVGElement) {
		if (this.sanitize) {
			return;
		}

		// Don't add multiple copies of the default stylesheet.
		if (elem.tagName.toLowerCase() === 'style' && elem.getAttribute('id') === renderedStylesheetId) {
			return;
		}

		const elemToDraw = elem.cloneNode(true) as SVGElement;
		this.elem.appendChild(elemToDraw);
		this.objectElems?.push(elemToDraw);
	}

	public isTooSmallToRender(_rect: Rect2): boolean {
		return false;
	}

	private visibleRectOverride: Rect2|null = null;

	/**
	 * Overrides the visible region returned by `getVisibleRect`.
	 *
	 * This is useful when the `viewport`'s transform has been modified,
	 * for example, to compensate for storing part of the image's
	 * transformation in an SVG property.
	 */
	private overrideVisibleRect(newRect: Rect2) {
		this.visibleRectOverride = newRect;
	}

	public override getVisibleRect(): Rect2 {
		return this.visibleRectOverride ?? super.getVisibleRect();
	}

	/**
	 * Creates a new SVG element and `SVGRenerer` with `width`, `height`, `viewBox`,
	 * and other metadata attributes set for the given `Viewport`.
	 *
	 * If `options` is a `boolean`, it is interpreted as whether to sanitize (not add unknown
	 * SVG entities to) the output.
	 */
	public static fromViewport(viewport: Viewport, options: FromViewportOptions|boolean = true) {
		let sanitize: boolean;
		let useViewBoxForPositioning: boolean;
		if (typeof options === 'boolean') {
			sanitize = options;
			useViewBoxForPositioning = false;
		} else {
			sanitize = options.sanitize ?? true;
			useViewBoxForPositioning = options.useViewBoxForPositioning ?? false;
		}

		const svgNameSpace = 'http://www.w3.org/2000/svg';
		const result = document.createElementNS(svgNameSpace, 'svg');

		const screenRectSize = viewport.getScreenRectSize();
		const visibleRect = viewport.visibleRect;

		let viewBoxComponents: number[];
		if (useViewBoxForPositioning) {
			const exportRect = viewport.visibleRect;
			viewBoxComponents = [
				exportRect.x, exportRect.y, exportRect.w, exportRect.h,
			];

			// Replace the viewport with a copy that has a modified transform.
			// (Avoids modifying the original viewport).
			viewport = viewport.getTemporaryClone();

			// TODO: This currently discards any rotation information.
			// Render with (0,0) at (0,0) -- the translation is handled by the viewBox.
			viewport.resetTransform(Mat33.identity);
		} else {
			viewBoxComponents = [0, 0, screenRectSize.x, screenRectSize.y];
		}

		// rect.x -> size of rect in x direction, rect.y -> size of rect in y direction.
		result.setAttribute('viewBox', viewBoxComponents.map(part => toRoundedString(part)).join(' '));
		result.setAttribute('width', toRoundedString(screenRectSize.x));
		result.setAttribute('height', toRoundedString(screenRectSize.y));

		// Ensure the image can be identified as an SVG if downloaded.
		// See https://jwatt.org/svg/authoring/
		result.setAttribute('version', '1.1');
		result.setAttribute('baseProfile', 'full');
		result.setAttribute('xmlns', svgNameSpace);

		const renderer = new SVGRenderer(result, viewport, sanitize);

		if (!visibleRect.eq(viewport.visibleRect)) {
			renderer.overrideVisibleRect(visibleRect);
		}

		return { element: result, renderer };
	}
}
