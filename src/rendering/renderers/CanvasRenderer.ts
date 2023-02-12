import Color4 from '../../Color4';
import TextComponent from '../../components/TextComponent';
import Mat33 from '../../math/Mat33';
import Path from '../../math/Path';
import Rect2 from '../../math/Rect2';
import { Point2, Vec2 } from '../../math/Vec2';
import Vec3 from '../../math/Vec3';
import Viewport from '../../Viewport';
import RenderingStyle from '../RenderingStyle';
import TextStyle from '../TextRenderingStyle';
import AbstractRenderer, { RenderableImage, RenderablePathSpec } from './AbstractRenderer';

export default class CanvasRenderer extends AbstractRenderer {
	private ignoreObjectsAboveLevel: number|null = null;
	private ignoringObject: boolean = false;
	private currentObjectBBox: Rect2|null = null;

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

	private transformBy(transformBy: Mat33) {
		// From MDN, transform(a,b,c,d,e,f)
		// takes input such that
		// ⎡ a c e ⎤
		// ⎢ b d f ⎥ transforms content drawn to [ctx].
		// ⎣ 0 0 1 ⎦
		this.ctx.transform(
			transformBy.a1, transformBy.b1, // a, b
			transformBy.a2, transformBy.b2, // c, d
			transformBy.a3, transformBy.b3, // e, f 
		);
	}

	public canRenderFromWithoutDataLoss(other: AbstractRenderer) {
		return other instanceof CanvasRenderer;
	}

	public renderFromOtherOfSameType(transformBy: Mat33, other: AbstractRenderer): void {
		if (!(other instanceof CanvasRenderer)) {
			throw new Error(`${other} cannot be rendered onto ${this}`);
		}
		transformBy = this.getCanvasToScreenTransform().rightMul(transformBy);
		this.ctx.save();
		this.transformBy(transformBy);
		this.ctx.drawImage(other.ctx.canvas, 0, 0);
		this.ctx.restore();
	}

	// Set parameters for lower/higher quality rendering
	public setDraftMode(draftMode: boolean) {
		if (draftMode) {
			this.minSquareCurveApproxDist = 9;
			this.minRenderSizeBothDimens = 2;
			this.minRenderSizeAnyDimen = 0.5;
		} else {
			this.minSquareCurveApproxDist = 0.5;
			this.minRenderSizeBothDimens = 0.2;
			this.minRenderSizeAnyDimen = 1e-6;
		}
	}

	public displaySize(): Vec2 {
		return Vec2.of(
			this.ctx.canvas.clientWidth,
			this.ctx.canvas.clientHeight,
		);
	}

	public clear() {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	}

	protected beginPath(startPoint: Point2) {
		startPoint = this.canvasToScreen(startPoint);

		this.ctx.beginPath();
		this.ctx.moveTo(startPoint.x, startPoint.y);
	}

	protected endPath(style: RenderingStyle) {
		this.ctx.fillStyle = style.fill.toHexString();
		this.ctx.fill();

		if (style.stroke) {
			this.ctx.strokeStyle = style.stroke.color.toHexString();
			this.ctx.lineWidth = this.getSizeOfCanvasPixelOnScreen() * style.stroke.width;
			this.ctx.lineCap = 'round';
			this.ctx.lineJoin = 'round';
			this.ctx.stroke();
		}

		this.ctx.closePath();
	}

	protected lineTo(point: Point2) {
		point = this.canvasToScreen(point);
		this.ctx.lineTo(point.x, point.y);
	}

	protected moveTo(point: Point2) {
		point = this.canvasToScreen(point);
		this.ctx.moveTo(point.x, point.y);
	}

	protected traceCubicBezierCurve(p1: Point2, p2: Point2, p3: Point2) {
		p1 = this.canvasToScreen(p1);
		p2 = this.canvasToScreen(p2);
		p3 = this.canvasToScreen(p3);

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
		controlPoint = this.canvasToScreen(controlPoint);
		endPoint = this.canvasToScreen(endPoint);

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

		// If part of a huge object, it might be worth trimming the path
		if (this.currentObjectBBox?.containsRect(this.getViewport().visibleRect)) {
			// Try to trim/remove parts of the path outside of the bounding box.
			path = Path.visualEquivalent(
				path,
				this.getViewport().visibleRect
			);
		}

		super.drawPath(path);
	}

	public drawText(text: string, transform: Mat33, style: TextStyle): void {
		this.ctx.save();
		transform = this.getCanvasToScreenTransform().rightMul(transform);
		this.transformBy(transform);
		TextComponent.applyTextStyles(this.ctx, style);

		if (style.renderingStyle.fill.a !== 0) {
			this.ctx.fillStyle = style.renderingStyle.fill.toHexString();
			this.ctx.fillText(text, 0, 0);
		}
		if (style.renderingStyle.stroke) {
			this.ctx.strokeStyle = style.renderingStyle.stroke.color.toHexString();
			this.ctx.lineWidth = style.renderingStyle.stroke.width;
			this.ctx.strokeText(text, 0, 0);
		}

		this.ctx.restore();
	}

	public drawImage(image: RenderableImage) {
		this.ctx.save();
		const transform = this.getCanvasToScreenTransform().rightMul(image.transform);
		this.transformBy(transform);

		this.ctx.drawImage(image.image, 0, 0);
		this.ctx.restore();
	}

	private clipLevels: number[] = [];
	public startObject(boundingBox: Rect2, clip?: boolean) {
		if (this.isTooSmallToRender(boundingBox)) {
			this.ignoreObjectsAboveLevel = this.getNestingLevel();
			this.ignoringObject = true;
		}

		super.startObject(boundingBox);
		this.currentObjectBBox = boundingBox;

		if (!this.ignoringObject && clip) {
			this.clipLevels.push(this.objectLevel);
			this.ctx.save();
			this.ctx.beginPath();
			for (const corner of boundingBox.corners) {
				const screenCorner = this.canvasToScreen(corner);
				this.ctx.lineTo(screenCorner.x, screenCorner.y);
			}
			this.ctx.clip();
		}
	}

	public endObject() {
		if (!this.ignoringObject && this.clipLevels.length > 0) {
			if (this.clipLevels[this.clipLevels.length - 1] === this.objectLevel) {
				this.ctx.restore();
				this.clipLevels.pop();
			}
		}

		this.currentObjectBBox = null;
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
			const point = this.canvasToScreen(points[i]);

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

	public isTooSmallToRender(rect: Rect2): boolean {
		// Should we ignore all objects within this object's bbox?
		const diagonal = this.getCanvasToScreenTransform().transformVec3(rect.size);

		const bothDimenMinSize = this.minRenderSizeBothDimens;
		const bothTooSmall = Math.abs(diagonal.x) < bothDimenMinSize && Math.abs(diagonal.y) < bothDimenMinSize;
		const anyDimenMinSize = this.minRenderSizeAnyDimen;
		const anyTooSmall = Math.abs(diagonal.x) < anyDimenMinSize || Math.abs(diagonal.y) < anyDimenMinSize;
		
		return bothTooSmall || anyTooSmall;
	}
}
