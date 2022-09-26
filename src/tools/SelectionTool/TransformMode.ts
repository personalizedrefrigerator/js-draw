import Editor from '../../Editor';
import Mat33 from '../../math/Mat33';
import { Point2, Vec2 } from '../../math/Vec2';
import Vec3 from '../../math/Vec3';
import Selection from './Selection';
import { ResizeMode } from './types';

export class DragTransformer {
	private dragStartPoint: Point2;
	public constructor(_editor: Editor, private selection: Selection) { }

	public onDragStart(startPoint: Vec3) {
		this.selection.setTransform(Mat33.identity);
		this.dragStartPoint = startPoint;
	}
	public onDragUpdate(canvasPos: Vec3) {
		const delta = canvasPos.minus(this.dragStartPoint);
		this.selection.setTransform(Mat33.translation(
			delta
		));
	}
	public onDragEnd() {
		this.selection.finalizeTransform();
	}
}

export class ResizeTransformer {
	private mode: ResizeMode = ResizeMode.Both;
	private dragStartPoint: Point2;
	public constructor(_editor: Editor, private selection: Selection) { }

	public onDragStart(startPoint: Vec3, mode: ResizeMode) {
		this.selection.setTransform(Mat33.identity);
		this.mode = mode;
		this.dragStartPoint = startPoint;
	}
	public onDragUpdate(canvasPos: Vec3) {
		const canvasDelta = canvasPos.minus(this.dragStartPoint);

		const origWidth = this.selection.preTransformRegion.width;
		const origHeight = this.selection.preTransformRegion.height;

		let scale = Vec2.of(1, 1);
		if (this.mode === ResizeMode.HorizontalOnly) {
			const newWidth = origWidth + canvasDelta.x;
			scale = Vec2.of(newWidth / origWidth, scale.y);
		}

		if (this.mode === ResizeMode.VerticalOnly) {
			const newHeight = origHeight + canvasDelta.y;
			scale = Vec2.of(scale.x, newHeight / origHeight);
		}

		if (this.mode === ResizeMode.Both) {
			const delta = Math.abs(canvasDelta.x) > Math.abs(canvasDelta.y) ? canvasDelta.x : canvasDelta.y;
			const newWidth = origWidth + delta;
			scale = Vec2.of(newWidth / origWidth, newWidth / origWidth);
		}

		// TODO: Round scale as a scale factor.

		if (scale.x > 0 && scale.y > 0) {
			this.selection.setTransform(Mat33.scaling2D(scale, this.selection.preTransformRegion.topLeft));
		}
	}
	public onDragEnd() {
		this.selection.finalizeTransform();
	}
}

export class RotateTransformer {
	private startAngle: number = 0;
	public constructor(_editor: Editor, private selection: Selection) { }

	private getAngle(canvasPoint: Point2) {
		const selectionCenter = this.selection.preTransformRegion.center;
		const offset = canvasPoint.minus(selectionCenter);
		return offset.angle();
	}

	public onDragStart(startPoint: Vec3) {
		this.selection.setTransform(Mat33.identity);
		this.startAngle = this.getAngle(startPoint);
	}

	public onDragUpdate(canvasPos: Vec3) {
		const targetRotation = this.getAngle(canvasPos) - this.startAngle;

		// Transform in canvas space
		const canvasSelCenter = this.selection.preTransformRegion.center;
		this.selection.setTransform(Mat33.zRotation(targetRotation, canvasSelCenter));
	}
	public onDragEnd() {
		this.selection.finalizeTransform();
	}
}
