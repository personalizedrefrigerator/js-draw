// Renderer that outputs nothing. Useful for automated tests.

import { TextStyle } from '../../components/Text';
import Mat33 from '../../geometry/Mat33';
import Rect2 from '../../geometry/Rect2';
import { Point2, Vec2 } from '../../geometry/Vec2';
import Vec3 from '../../geometry/Vec3';
import Viewport from '../../Viewport';
import RenderingStyle from '../RenderingStyle';
import AbstractRenderer from './AbstractRenderer';

export default class DummyRenderer extends AbstractRenderer {
	// Variables that track the state of what's been rendered
	public clearedCount: number = 0;
	public renderedPathCount: number = 0;
	public lastFillStyle: RenderingStyle|null = null;
	public lastPoint: Point2|null = null;
	public objectNestingLevel: number = 0;
	public lastText: string|null = null;

	// List of points drawn since the last clear.
	public pointBuffer: Point2[] = [];

	public constructor(viewport: Viewport) {
		super(viewport);
	}

	public displaySize(): Vec2 {
		// Do we have a stored viewport size?
		const viewportSize = this.getViewport().getResolution();

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


	public drawText(text: string, _transform: Mat33, _style: TextStyle): void {
		this.lastText = text;
	}

	public startObject(boundingBox: Rect2, _clip: boolean) {
		super.startObject(boundingBox);

		this.objectNestingLevel += 1;
	}
	public endObject() {
		super.endObject();

		this.objectNestingLevel -= 1;
	}

	public isTooSmallToRender(_rect: Rect2): boolean {
		return false;
	}


	public canRenderFromWithoutDataLoss(other: AbstractRenderer) {
		return other instanceof DummyRenderer;
	}

	public renderFromOtherOfSameType(transform: Mat33, other: AbstractRenderer): void {
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
}