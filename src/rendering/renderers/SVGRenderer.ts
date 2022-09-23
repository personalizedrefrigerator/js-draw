
import { LoadSaveDataTable } from '../../components/AbstractComponent';
import { TextStyle } from '../../components/Text';
import Mat33 from '../../math/Mat33';
import Path from '../../math/Path';
import Rect2 from '../../math/Rect2';
import { toRoundedString } from '../../math/rounding';
import { Point2, Vec2 } from '../../math/Vec2';
import { svgAttributesDataKey, SVGLoaderUnknownAttribute, SVGLoaderUnknownStyleAttribute, svgStyleAttributesDataKey } from '../../SVGLoader';
import Viewport from '../../Viewport';
import RenderingStyle from '../RenderingStyle';
import AbstractRenderer, { RenderableImage, RenderablePathSpec } from './AbstractRenderer';

const svgNameSpace = 'http://www.w3.org/2000/svg';
export default class SVGRenderer extends AbstractRenderer {
	private lastPathStyle: RenderingStyle|null = null;
	private lastPathString: string[] = [];
	private objectElems: SVGElement[]|null = null;

	private overwrittenAttrs: Record<string, string|null> = {};

	// Renders onto `elem`. If `sanitize`, don't render potentially untrusted data.
	public constructor(private elem: SVGSVGElement, viewport: Viewport, private sanitize: boolean = false) {
		super(viewport);
		this.clear();
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

	// Push [this.fullPath] to the SVG
	private addPathToSVG() {
		if (!this.lastPathStyle || this.lastPathString.length === 0) {
			return;
		}

		const pathElem = document.createElementNS(svgNameSpace, 'path');
		pathElem.setAttribute('d', this.lastPathString.join(' '));

		const style = this.lastPathStyle;
		pathElem.setAttribute('fill', style.fill.toHexString());

		if (style.stroke) {
			pathElem.setAttribute('stroke', style.stroke.color.toHexString());
			pathElem.setAttribute('stroke-width', style.stroke.width.toString());
		}

		this.elem.appendChild(pathElem);
		this.objectElems?.push(pathElem);
	}

	public drawPath(pathSpec: RenderablePathSpec) {
		const style = pathSpec.style;
		const path = Path.fromRenderable(pathSpec);

		// Try to extend the previous path, if possible
		if (!style.fill.eq(this.lastPathStyle?.fill) || this.lastPathString.length === 0) {
			this.addPathToSVG();
			this.lastPathStyle = style;
			this.lastPathString = [];
		}
		this.lastPathString.push(path.toString());
	}

	// Apply [elemTransform] to [elem].
	private transformFrom(elemTransform: Mat33, elem: SVGElement) {
		let transform = this.getCanvasToScreenTransform().rightMul(elemTransform);
		const translation = transform.transformVec2(Vec2.zero);
		transform = transform.rightMul(Mat33.translation(translation.times(-1)));

		elem.style.transform = `matrix(
			${transform.a1}, ${transform.b1},
			${transform.a2}, ${transform.b2},
			${transform.a3}, ${transform.b3}
		)`;
		elem.setAttribute('x', `${toRoundedString(translation.x)}`);
		elem.setAttribute('y', `${toRoundedString(translation.y)}`);
	}

	public drawText(text: string, transform: Mat33, style: TextStyle): void {
		const textElem = document.createElementNS(svgNameSpace, 'text');
		textElem.appendChild(document.createTextNode(text));
		this.transformFrom(transform, textElem);

		textElem.style.fontFamily = style.fontFamily;
		textElem.style.fontVariant = style.fontVariant ?? '';
		textElem.style.fontWeight = style.fontWeight ?? '';
		textElem.style.fontSize = style.size + 'px';
		textElem.style.fill = style.renderingStyle.fill.toHexString();

		if (style.renderingStyle.stroke) {
			const strokeStyle = style.renderingStyle.stroke;
			textElem.style.stroke = strokeStyle.color.toHexString();
			textElem.style.strokeWidth = strokeStyle.width + 'px';
		}

		this.elem.appendChild(textElem);
		this.objectElems?.push(textElem);
	}

	public drawImage(image: RenderableImage) {
		const svgImgElem = document.createElementNS(svgNameSpace, 'image');
		svgImgElem.setAttribute('href', image.base64Url);
		svgImgElem.setAttribute('width', image.image.getAttribute('width') ?? '');
		svgImgElem.setAttribute('height', image.image.getAttribute('height') ?? '');
		svgImgElem.setAttribute('aria-label', image.image.getAttribute('aria-label') ?? image.image.getAttribute('alt') ?? '');
		this.transformFrom(image.transform, svgImgElem);

		this.elem.appendChild(svgImgElem);
		this.objectElems?.push(svgImgElem);
	}

	public startObject(boundingBox: Rect2) {
		super.startObject(boundingBox);

		// Only accumulate a path within an object
		this.lastPathString = [];
		this.lastPathStyle = null;
		this.objectElems = [];
	}

	public endObject(loaderData?: LoadSaveDataTable) {
		super.endObject(loaderData);

		// Don't extend paths across objects
		this.addPathToSVG();

		if (loaderData && !this.sanitize) {
			// Restore any attributes unsupported by the app.
			for (const elem of this.objectElems ?? []) {
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

		this.elem.appendChild(elem.cloneNode(true));
	}

	public isTooSmallToRender(_rect: Rect2): boolean {
		return false;
	}
}
