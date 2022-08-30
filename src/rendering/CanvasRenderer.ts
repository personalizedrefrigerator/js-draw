import Color4 from '../Color4';
import Rect2 from '../geometry/Rect2';
import { Point2, Vec2 } from '../geometry/Vec2';
import Vec3 from '../geometry/Vec3';
import Viewport from '../Viewport';
import AbstractRenderer, { RenderablePathSpec, RenderingStyle } from './AbstractRenderer';

export default class CanvasRenderer extends AbstractRenderer {
	private ignoreObjectsAboveLevel: number|null = null;
	private ignoringObject: boolean = false;

	// Minimum square distance of a control point from the line between the end points
	// for the curve not to be drawn as a line.
	// For example, if [minSquareCurveApproxDist] = 25 = 5², then a control point on a quadratic
	// bezier curve needs to be at least 5 units away from the line between the curve's end points
	// for the curve to be drawn as a Bezier curve (and not a line).
	private minSquareCurveApproxDist: number;

	// Minimum size of an object (in pixels) for it to be rendered.
	private minRenderSizeAnyDimen: number;
	private minRenderSizeBothDimens: number;

	public constructor(private ctx: CanvasRenderingContext2D, viewport: Viewport) {
		super(viewport);
		this.setDraftMode(false);
	}

	// Set parameters for lower/higher quality rendering
	public setDraftMode(draftMode: boolean) {
		if (draftMode) {
			this.minSquareCurveApproxDist = 64;
			this.minRenderSizeBothDimens = 8;
			this.minRenderSizeAnyDimen = 2;
		} else {
			this.minSquareCurveApproxDist = 1;
			this.minRenderSizeBothDimens = 1;
			this.minRenderSizeAnyDimen = 0;
		}
	}

	public displaySize(): Vec2 {
		return Vec2.of(
			this.ctx.canvas.clientWidth,
			this.ctx.canvas.clientHeight
		);
	}

	public clear() {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	}

	protected beginPath(startPoint: Point2) {
		startPoint = this.viewport.canvasToScreen(startPoint);

		this.ctx.beginPath();
		this.ctx.moveTo(startPoint.x, startPoint.y);
	}

	protected endPath(style: RenderingStyle) {
		this.ctx.fillStyle = style.fill.toHexString();
		this.ctx.fill();

		if (style.stroke) {
			this.ctx.strokeStyle = style.stroke.color.toHexString();
			this.ctx.lineWidth = this.viewport.getScaleFactor() * style.stroke.width;
			this.ctx.stroke();
		}

		this.ctx.closePath();
	}

	protected lineTo(point: Point2) {
		point = this.viewport.canvasToScreen(point);
		this.ctx.lineTo(point.x, point.y);
	}

	protected moveTo(point: Point2) {
		point = this.viewport.canvasToScreen(point);
		this.ctx.moveTo(point.x, point.y);
	}

	protected traceCubicBezierCurve(p1: Point2, p2: Point2, p3: Point2) {
		p1 = this.viewport.canvasToScreen(p1);
		p2 = this.viewport.canvasToScreen(p2);
		p3 = this.viewport.canvasToScreen(p3);

		// Approximate the curve if small enough.
		const delta1 = p2.minus(p1);
		const delta2 = p3.minus(p2);
		if (delta1.magnitudeSquared() < this.minSquareCurveApproxDist
			&& delta2.magnitudeSquared() < this.minSquareCurveApproxDist) {
			this.ctx.lineTo(p3.x, p3.y);
		} else {
			this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
		}
	}

	protected traceQuadraticBezierCurve(controlPoint: Vec3, endPoint: Vec3) {
		controlPoint = this.viewport.canvasToScreen(controlPoint);
		endPoint = this.viewport.canvasToScreen(endPoint);

		// Approximate the curve with a line if small enough
		const delta = controlPoint.minus(endPoint);
		if (delta.magnitudeSquared() < this.minSquareCurveApproxDist) {
			this.ctx.lineTo(endPoint.x, endPoint.y);
		} else {
			this.ctx.quadraticCurveTo(
				controlPoint.x, controlPoint.y, endPoint.x, endPoint.y
			);
		}
	}

	public drawPath(path: RenderablePathSpec) {
		if (this.ignoringObject) {
			return;
		}

		super.drawPath(path);
	}

	public startObject(boundingBox: Rect2) {
		// Should we ignore all objects within this object's bbox?
		const diagonal = this.viewport.canvasToScreenTransform.transformVec3(boundingBox.size);

		const bothDimenMinSize = this.minRenderSizeBothDimens;
		const bothTooSmall = Math.abs(diagonal.x) < bothDimenMinSize && Math.abs(diagonal.y) < bothDimenMinSize;
		const anyDimenMinSize = this.minRenderSizeAnyDimen;
		const anyTooSmall = Math.abs(diagonal.x) < anyDimenMinSize || Math.abs(diagonal.y) < anyDimenMinSize;

		if (bothTooSmall || anyTooSmall) {
			this.ignoreObjectsAboveLevel = this.getNestingLevel();
			this.ignoringObject = true;
		}

		super.startObject(boundingBox);
	}
	public endObject() {
		super.endObject();

		// If exiting an object with a too-small-to-draw bounding box,
		if (this.ignoreObjectsAboveLevel !== null && this.getNestingLevel() <= this.ignoreObjectsAboveLevel) {
			this.ignoreObjectsAboveLevel = null;
			this.ignoringObject = false;
		}
	}

	public drawPoints(...points: Point2[]) {
		const pointRadius = 10;

		for (let i = 0; i < points.length; i++) {
			const point = this.viewport.canvasToScreen(points[i]);

			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
			this.ctx.fillStyle = Color4.ofRGBA(
				0.5 + Math.sin(i) / 2,
				1.0,
				0.5 + Math.cos(i * 0.2) / 4, 0.5
			).toHexString();
			this.ctx.fill();
			this.ctx.stroke();
			this.ctx.closePath();

			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillStyle = 'black';
			this.ctx.fillText(`${i}`, point.x, point.y, pointRadius * 2);
		}
	}
}
