import { Mat33, Rect2, Point2, Vec2, Vec3 } from '@js-draw/math';
import Viewport from '../../Viewport';
import RenderingStyle from '../RenderingStyle';
import TextRenderingStyle from '../TextRenderingStyle';
import AbstractRenderer, { RenderableImage } from './AbstractRenderer';

// Renderer that outputs almost nothing. Useful for automated tests.
export default class DummyRenderer extends AbstractRenderer {
	// Variables that track the state of what's been rendered
	public clearedCount: number = 0;
	public renderedPathCount: number = 0;
	public lastFillStyle: RenderingStyle|null = null;
	public lastPoint: Point2|null = null;
	public objectNestingLevel: number = 0;
	public lastText: string|null = null;
	public lastImage: RenderableImage|null = null;

	// List of points drawn since the last clear.
	public pointBuffer: Point2[] = [];

	public constructor(viewport: Viewport) {
		super(viewport);
	}

	public displaySize(): Vec2 {
		// Do we have a stored viewport size?
		const viewportSize = this.getViewport().getScreenRectSize();

		// Don't use a 0x0 viewport — DummyRenderer is often used
		// for tests that run without a display, so pretend we have a
		// reasonable-sized display.
		if (viewportSize.x === 0 || viewportSize.y === 0) {
			return Vec2.of(640, 480);
		}

		return viewportSize;
	}

	public clear() {
		this.clearedCount ++;
		this.renderedPathCount = 0;
		this.pointBuffer = [];
		this.lastText = null;
		this.lastImage = null;

		// Ensure all objects finished rendering
		if (this.objectNestingLevel > 0) {
			throw new Error(
				`Within an object while clearing! Nesting level: ${this.objectNestingLevel}`
			);
		}
	}

	protected beginPath(startPoint: Vec3) {
		this.lastPoint = startPoint;
		this.pointBuffer.push(startPoint);
	}

	protected endPath(style: RenderingStyle) {
		this.renderedPathCount++;
		this.lastFillStyle = style;
	}

	protected lineTo(point: Vec3) {
		point = this.canvasToScreen(point);

		this.lastPoint = point;
		this.pointBuffer.push(point);
	}

	protected moveTo(point: Point2) {
		point = this.canvasToScreen(point);

		this.lastPoint = point;
		this.pointBuffer.push(point);
	}

	protected traceCubicBezierCurve(p1: Vec3, p2: Vec3, p3: Vec3) {
		p1 = this.canvasToScreen(p1);
		p2 = this.canvasToScreen(p2);
		p3 = this.canvasToScreen(p3);

		this.lastPoint = p3;
		this.pointBuffer.push(p1, p2, p3);
	}

	protected traceQuadraticBezierCurve(controlPoint: Vec3, endPoint: Vec3) {
		controlPoint = this.canvasToScreen(controlPoint);
		endPoint = this.canvasToScreen(endPoint);

		this.lastPoint = endPoint;
		this.pointBuffer.push(controlPoint, endPoint);
	}

	public drawPoints(..._points: Vec3[]) {
		// drawPoints is intended for debugging.
		// As such, it is unlikely to be the target of automated tests.
	}


	public drawText(text: string, _transform: Mat33, _style: TextRenderingStyle): void {
		this.lastText = text;
	}

	public drawImage(image: RenderableImage) {
		this.lastImage = image;
	}

	public override startObject(boundingBox: Rect2, _clip: boolean) {
		super.startObject(boundingBox);

		this.objectNestingLevel += 1;
	}

	public override endObject() {
		super.endObject();

		this.objectNestingLevel -= 1;
	}

	public isTooSmallToRender(_rect: Rect2): boolean {
		return false;
	}


	public override canRenderFromWithoutDataLoss(other: AbstractRenderer) {
		return other instanceof DummyRenderer;
	}

	public override renderFromOtherOfSameType(transform: Mat33, other: AbstractRenderer): void {
		if (!(other instanceof DummyRenderer)) {
			throw new Error(`${other} cannot be rendered onto ${this}`);
		}

		this.renderedPathCount += other.renderedPathCount;
		this.lastFillStyle = other.lastFillStyle;
		this.lastPoint = other.lastPoint;
		this.pointBuffer.push(...other.pointBuffer.map(point => {
			return transform.transformVec2(point);
		}));
	}

	public override toString() {
		return '[DummyRenderer]';
	}
}
