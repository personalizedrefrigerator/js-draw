import Editor from '../../Editor';
import { Vec3, Mat33, Vec2, Point2 } from '@js-draw/math';
import Viewport from '../../Viewport';
import Selection from './Selection';
import { ResizeMode } from './types';

export class DragTransformer {
	private dragStartPoint: Point2;
	public constructor(private readonly editor: Editor, private selection: Selection) { }

	public onDragStart(startPoint: Vec3) {
		this.selection.setTransform(Mat33.identity);
		this.dragStartPoint = startPoint;
	}
	public onDragUpdate(canvasPos: Vec3) {
		const delta = this.editor.viewport.roundPoint(canvasPos.minus(this.dragStartPoint));
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
	public constructor(private readonly editor: Editor, private selection: Selection) { }

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

		// Round: If this isn't done, scaling can create numbers with long decimal representations.
		//    long decimal representations => large file sizes.
		scale = scale.map(component => Viewport.roundScaleRatio(component, 2));

		if (scale.x !== 0 && scale.y !== 0) {
			const origin = this.editor.viewport.roundPoint(this.selection.preTransformRegion.topLeft);
			this.selection.setTransform(Mat33.scaling2D(scale, origin));
		}
	}
	public onDragEnd() {
		this.selection.finalizeTransform();
	}
}

export class RotateTransformer {
	private startAngle: number = 0;
	public constructor(private readonly editor: Editor, private selection: Selection) { }

	private getAngle(canvasPoint: Point2) {
		const selectionCenter = this.selection.preTransformRegion.center;
		const offset = canvasPoint.minus(selectionCenter);
		return offset.angle();
	}

	private roundAngle(angle: number) {
		// Round angles to the nearest 16th of a turn
		const roundingFactor = 16 / 2 / Math.PI;
		return Math.round(angle * roundingFactor) / roundingFactor;
	}

	public onDragStart(startPoint: Vec3) {
		this.selection.setTransform(Mat33.identity);
		this.startAngle = this.getAngle(startPoint);
	}

	public onDragUpdate(canvasPos: Vec3) {
		const targetRotation = this.roundAngle(this.getAngle(canvasPos) - this.startAngle);

		// Transform in canvas space
		const canvasSelCenter = this.editor.viewport.roundPoint(this.selection.preTransformRegion.center);
		const unrounded = Mat33.zRotation(targetRotation);
		const roundedRotationTransform = unrounded.mapEntries(entry => Viewport.roundScaleRatio(entry));

		const fullRoundedTransform = Mat33
			.translation(canvasSelCenter)
			.rightMul(roundedRotationTransform)
			.rightMul(Mat33.translation(canvasSelCenter.times(-1)));

		this.selection.setTransform(fullRoundedTransform);
	}
	public onDragEnd() {
		this.selection.finalizeTransform();
	}
}
