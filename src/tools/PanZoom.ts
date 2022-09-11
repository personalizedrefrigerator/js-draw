
import { Editor } from '../Editor';
import Mat33 from '../math/Mat33';
import { Point2, Vec2 } from '../math/Vec2';
import Vec3 from '../math/Vec3';
import Pointer, { PointerDevice } from '../Pointer';
import { EditorEventType, KeyPressEvent, PointerEvt, WheelEvt } from '../types';
import { Viewport, ViewportTransform } from '../Viewport';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';

interface PinchData {
	canvasCenter: Point2;
	screenCenter: Point2;
	angle: number;
	dist: number;
}


export enum PanZoomMode {
	OneFingerTouchGestures = 0x1,
	TwoFingerTouchGestures = 0x1 << 1,
	RightClickDrags = 0x1 << 2,
	SinglePointerGestures = 0x1 << 3,
	Keyboard = 0x1 << 4,
}

export default class PanZoom extends BaseTool {
	public readonly kind: ToolType.PanZoom = ToolType.PanZoom;
	private transform: ViewportTransform|null = null;

	private lastAngle: number;
	private lastDist: number;
	private lastScreenCenter: Point2;

	public constructor(private editor: Editor, private mode: PanZoomMode, description: string) {
		super(editor.notifier, description);
	}

	// Returns information about the pointers in a gesture
	public computePinchData(p1: Pointer, p2: Pointer): PinchData {
		const screenBetween = p2.screenPos.minus(p1.screenPos);
		const angle = screenBetween.angle();
		const dist = screenBetween.magnitude();
		const canvasCenter = p2.canvasPos.plus(p1.canvasPos).times(0.5);
		const screenCenter = p2.screenPos.plus(p1.screenPos).times(0.5);

		return { canvasCenter, screenCenter, angle, dist };
	}

	private allPointersAreOfType(pointers: Pointer[], kind: PointerDevice) {
		return pointers.every(pointer => pointer.device === kind);
	}

	public onPointerDown({ allPointers: pointers }: PointerEvt): boolean {
		let handlingGesture = false;

		const allAreTouch = this.allPointersAreOfType(pointers, PointerDevice.Touch);
		const isRightClick = this.allPointersAreOfType(pointers, PointerDevice.RightButtonMouse);

		if (allAreTouch && pointers.length === 2 && this.mode & PanZoomMode.TwoFingerTouchGestures) {
			const { screenCenter, angle, dist } = this.computePinchData(pointers[0], pointers[1]);
			this.lastAngle = angle;
			this.lastDist = dist;
			this.lastScreenCenter = screenCenter;
			handlingGesture = true;
		} else if (pointers.length === 1 && (
			(this.mode & PanZoomMode.OneFingerTouchGestures && allAreTouch)
			|| (isRightClick && this.mode & PanZoomMode.RightClickDrags)
			|| (this.mode & PanZoomMode.SinglePointerGestures)
		)) {
			this.lastScreenCenter = pointers[0].screenPos;
			handlingGesture = true;
		}

		if (handlingGesture) {
			this.transform ??= Viewport.transformBy(Mat33.identity);
			this.editor.display.setDraftMode(true);
		}

		return handlingGesture;
	}

	// Returns the change in position of the center of the given group of pointers.
	// Assumes this.lastScreenCenter has been set appropriately.
	private getCenterDelta(screenCenter: Point2): Vec2 {
		// Use transformVec3 to avoid translating the delta
		const delta = this.editor.viewport.screenToCanvasTransform.transformVec3(screenCenter.minus(this.lastScreenCenter));
		return delta;
	}

	private handleTwoFingerMove(allPointers: Pointer[]) {
		const { screenCenter, canvasCenter, angle, dist } = this.computePinchData(allPointers[0], allPointers[1]);

		const delta = this.getCenterDelta(screenCenter);

		const transformUpdate = Mat33.translation(delta)
			.rightMul(Mat33.scaling2D(dist / this.lastDist, canvasCenter))
			.rightMul(Mat33.zRotation(angle - this.lastAngle, canvasCenter));
		this.lastScreenCenter = screenCenter;
		this.lastDist = dist;
		this.lastAngle = angle;
		this.transform = Viewport.transformBy(
			this.transform!.transform.rightMul(transformUpdate)
		);
	}

	private handleOneFingerMove(pointer: Pointer) {
		const delta = this.getCenterDelta(pointer.screenPos);
		this.transform = Viewport.transformBy(
			this.transform!.transform.rightMul(
				Mat33.translation(delta)
			)
		);
		this.lastScreenCenter = pointer.screenPos;
	}

	public onPointerMove({ allPointers }: PointerEvt): void {
		this.transform ??= Viewport.transformBy(Mat33.identity);

		const lastTransform = this.transform;
		if (allPointers.length === 2) {
			this.handleTwoFingerMove(allPointers);
		} else if (allPointers.length === 1) {
			this.handleOneFingerMove(allPointers[0]);
		}
		lastTransform.unapply(this.editor);
		this.transform.apply(this.editor);
	}

	public onPointerUp(_event: PointerEvt): void {
		if (this.transform) {
			this.transform.unapply(this.editor);
			this.editor.dispatch(this.transform, false);
		}

		this.editor.display.setDraftMode(false);
		this.transform = null;
	}

	public onGestureCancel(): void {
		this.transform?.unapply(this.editor);
		this.editor.display.setDraftMode(false);
		this.transform = null;
	}

	// Applies [transformUpdate] to the editor. This stacks on top of the
	// current transformation, if it exists.
	private updateTransform(transformUpdate: Mat33, announce: boolean = false) {
		let newTransform = transformUpdate;
		if (this.transform) {
			newTransform = this.transform.transform.rightMul(transformUpdate);
		}

		this.transform?.unapply(this.editor);
		this.transform = Viewport.transformBy(newTransform);
		this.transform.apply(this.editor);

		if (announce) {
			this.editor.announceForAccessibility(this.transform.description(this.editor, this.editor.localization));
		}
	}

	public onWheel({ delta, screenPos }: WheelEvt): boolean {
		// Reset the transformation -- wheel events are individual events, so we don't
		// need to unapply/reapply.
		this.transform = Viewport.transformBy(Mat33.identity);

		const canvasPos = this.editor.viewport.screenToCanvas(screenPos);
		const toCanvas = this.editor.viewport.screenToCanvasTransform;

		// Transform without including translation
		const translation =
			toCanvas.transformVec3(
				Vec3.of(-delta.x, -delta.y, 0)
			);
		const pinchZoomScaleFactor = 1.04;
		const transformUpdate = Mat33.scaling2D(
			Math.max(0.25, Math.min(Math.pow(pinchZoomScaleFactor, -delta.z), 4)), canvasPos
		).rightMul(
			Mat33.translation(translation)
		);
		this.updateTransform(transformUpdate, true);

		return true;
	}

	public onKeyPress({ key }: KeyPressEvent): boolean {
		if (!(this.mode & PanZoomMode.Keyboard)) {
			return false;
		}

		// No need to keep the same the transform for keyboard events.
		this.transform = Viewport.transformBy(Mat33.identity);

		let translation = Vec2.zero;
		let scale = 1;
		let rotation = 0;

		// Keyboard shortcut handling
		switch (key) {
		case 'a':
		case 'h':
		case 'ArrowLeft':
			translation = Vec2.of(-1, 0);
			break;
		case 'd':
		case 'l':
		case 'ArrowRight':
			translation = Vec2.of(1, 0);
			break;
		case 'q':
		case 'k':
		case 'ArrowUp':
			translation = Vec2.of(0, -1);
			break;
		case 'e':
		case 'j':
		case 'ArrowDown':
			translation = Vec2.of(0, 1);
			break;
		case 'w':
			scale = 1 / 2;
			break;
		case 's':
			scale = 2;
			break;
		case 'r':
			rotation = 1;
			break;
		case 'R':
			rotation = -1;
			break;
		default:
			return false;
		}

		// For each keypress,
		translation = translation.times(30); // Move at most 30 units
		rotation *= Math.PI / 8; // Rotate at most a sixteenth of a rotation

		// Transform the canvas, not the viewport:
		translation = translation.times(-1);
		rotation = rotation * -1;
		scale = 1 / scale;

		const toCanvas = this.editor.viewport.screenToCanvasTransform;

		// Transform without translating (treat toCanvas as a linear instead of
		// an affine transformation).
		translation = toCanvas.transformVec3(translation);

		// Rotate/scale about the center of the canvas
		const transformCenter = this.editor.viewport.visibleRect.center;
		const transformUpdate = Mat33.scaling2D(
			scale, transformCenter
		).rightMul(Mat33.zRotation(
			rotation, transformCenter
		)).rightMul(Mat33.translation(
			translation
		));
		this.updateTransform(transformUpdate, true);

		return true;
	}

	public setMode(mode: PanZoomMode) {
		if (mode !== this.mode) {
			this.mode = mode;

			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		}
	}

	public getMode(): PanZoomMode {
		return this.mode;
	}
}
