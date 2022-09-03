
import { LoadSaveDataTable } from '../../components/AbstractComponent';
import Path, { PathCommand, PathCommandType } from '../../geometry/Path';
import Rect2 from '../../geometry/Rect2';
import { Point2, Vec2 } from '../../geometry/Vec2';
import { svgAttributesDataKey, SVGLoaderUnknownAttribute } from '../../SVGLoader';
import Viewport from '../../Viewport';
import AbstractRenderer, { RenderingStyle } from './AbstractRenderer';

const svgNameSpace = 'http://www.w3.org/2000/svg';
export default class SVGRenderer extends AbstractRenderer {
	private currentPath: PathCommand[]|null;
	private pathStart: Point2|null;

	private lastPathStyle: RenderingStyle|null;
	private lastPath: PathCommand[]|null;
	private lastPathStart: Point2|null;
	private objectElems: SVGElement[]|null = null;

	private overwrittenAttrs: Record<string, string|null> = {};

	public constructor(private elem: SVGSVGElement, viewport: Viewport) {
		super(viewport);
		this.clear();
	}

	// Sets an attribute on the root SVG element.
	public setRootSVGAttribute(name: string, value: string|null) {
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
		// Restore all alltributes
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

	protected beginPath(startPoint: Point2) {
		this.currentPath = [];
		this.pathStart = this.canvasToScreen(startPoint);
		this.lastPathStart ??= this.pathStart;
	}

	protected endPath(style: RenderingStyle) {
		if (this.currentPath == null) {
			throw new Error('No path exists to end! Make sure beginPath was called!');
		}

		// Try to extend the previous path, if possible
		if (style.fill.eq(this.lastPathStyle?.fill) && this.lastPath != null) {
			this.lastPath.push({
				kind: PathCommandType.MoveTo,
				point: this.pathStart!,
			}, ...this.currentPath);
			this.pathStart = null;
			this.currentPath = null;
		} else {
			this.addPathToSVG();
			this.lastPathStart = this.pathStart;
			this.lastPathStyle = style;
			this.lastPath = this.currentPath;

			this.pathStart = null;
			this.currentPath = null;
		}
	}

	// Push [this.fullPath] to the SVG
	private addPathToSVG() {
		if (!this.lastPathStyle || !this.lastPath) {
			return;
		}

		const pathElem = document.createElementNS(svgNameSpace, 'path');
		pathElem.setAttribute('d', Path.toString(this.lastPathStart!, this.lastPath));

		const style = this.lastPathStyle;
		pathElem.setAttribute('fill', style.fill.toHexString());

		if (style.stroke) {
			pathElem.setAttribute('stroke', style.stroke.color.toHexString());
			pathElem.setAttribute('stroke-width', style.stroke.width.toString());
		}

		this.elem.appendChild(pathElem);
		this.objectElems?.push(pathElem);
	}

	public startObject(boundingBox: Rect2) {
		super.startObject(boundingBox);

		// Only accumulate a path within an object
		this.lastPath = null;
		this.lastPathStart = null;
		this.lastPathStyle = null;
		this.objectElems = [];
	}

	public endObject(loaderData?: LoadSaveDataTable) {
		super.endObject(loaderData);

		// Don't extend paths across objects
		this.addPathToSVG();

		if (loaderData) {
			// Restore any attributes unsupported by the app.
			for (const elem of this.objectElems ?? []) {
				const attrs = loaderData[svgAttributesDataKey] as SVGLoaderUnknownAttribute[]|undefined;

				if (attrs) {
					for (const [ attr, value ] of attrs) {
						elem.setAttribute(attr, value);
					}
				}
			}
		}
	}

	protected lineTo(point: Point2) {
		point = this.canvasToScreen(point);

		this.currentPath!.push({
			kind: PathCommandType.LineTo,
			point,
		});
	}

	protected moveTo(point: Point2) {
		point = this.canvasToScreen(point);

		this.currentPath!.push({
			kind: PathCommandType.MoveTo,
			point,
		});
	}

	protected traceCubicBezierCurve(
		controlPoint1: Point2, controlPoint2: Point2, endPoint: Point2
	) {
		controlPoint1 = this.canvasToScreen(controlPoint1);
		controlPoint2 = this.canvasToScreen(controlPoint2);
		endPoint = this.canvasToScreen(endPoint);

		this.currentPath!.push({
			kind: PathCommandType.CubicBezierTo,
			controlPoint1,
			controlPoint2,
			endPoint,
		});
	}

	protected traceQuadraticBezierCurve(controlPoint: Point2, endPoint: Point2) {
		controlPoint = this.canvasToScreen(controlPoint);
		endPoint = this.canvasToScreen(endPoint);

		this.currentPath!.push({
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint,
			endPoint,
		});
	}

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
		this.elem.appendChild(elem.cloneNode(true));
	}

	public isTooSmallToRender(_rect: Rect2): boolean {
		return false;
	}
}
