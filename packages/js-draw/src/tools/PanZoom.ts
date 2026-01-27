import { Editor } from '../Editor';
import { Mat33, Vec3, Point2, Vec2 } from '@js-draw/math';
import Pointer, { PointerDevice } from '../Pointer';
import { EditorEventType } from '../types';
import { KeyPressEvent, PointerEvt, WheelEvt } from '../inputEvents';
import untilNextAnimationFrame from '../util/untilNextAnimationFrame';
import { Viewport, ViewportTransform } from '../Viewport';
import BaseTool from './BaseTool';
import {
	moveDownKeyboardShortcutId,
	moveLeftKeyboardShortcutId,
	moveRightKeyboardShortcutId,
	moveUpKeyboardShortcutId,
	rotateClockwiseKeyboardShortcutId,
	rotateCounterClockwiseKeyboardShortcutId,
	zoomInKeyboardShortcutId,
	zoomOutKeyboardShortcutId,
} from './keybindings';

interface PinchData {
	canvasCenter: Point2;
	screenCenter: Point2;
	angle: number;
	dist: number;
}

export enum PanZoomMode {
	/** Touch gestures with a single pointer. Ignores non-touch gestures. */
	OneFingerTouchGestures = 0x1,
	/** Touch gestures with exactly two pointers. Ignores non-touch gestures. */
	TwoFingerTouchGestures = 0x1 << 1,
	RightClickDrags = 0x1 << 2,
	/** Single-pointer gestures of *any* type (including touch). */
	SinglePointerGestures = 0x1 << 3,
	/** Keyboard navigation (e.g. LeftArrow to move left). */
	Keyboard = 0x1 << 4,

	/** If provided, prevents **this** tool from rotating the viewport (other tools may still do so). */
	RotationLocked = 0x1 << 5,
}

// Returns true to cancel
type ScrollByCallback = (delta: Vec2) => boolean;

class InertialScroller {
	private running: boolean = false;
	private currentVelocity: Vec2;

	public constructor(
		private initialVelocity: Vec2,
		private scrollBy: ScrollByCallback,
		private onComplete: () => void,
	) {
		this.start();
	}

	private async start() {
		if (this.running) {
			return;
		}

		this.currentVelocity = this.initialVelocity;
		let lastTime = performance.now();
		this.running = true;

		const maxSpeed = 5000; // units/s
		const minSpeed = 200; // units/s
		if (this.currentVelocity.magnitude() > maxSpeed) {
			this.currentVelocity = this.currentVelocity.normalized().times(maxSpeed);
		}

		while (this.running && this.currentVelocity.magnitude() > minSpeed) {
			const nowTime = performance.now();
			const dt = (nowTime - lastTime) / 1000;

			this.currentVelocity = this.currentVelocity.times(Math.pow(1 / 8, dt));
			if (!this.scrollBy(this.currentVelocity.times(dt))) {
				this.stop();
			}

			await untilNextAnimationFrame();
			lastTime = nowTime;
		}

		if (this.running) {
			this.stop();
		}
	}

	public getCurrentVelocity(): Vec2 | null {
		if (!this.running) {
			return null;
		}

		return this.currentVelocity;
	}

	public stop(): void {
		if (this.running) {
			this.running = false;
			this.onComplete();
		}
	}
}

/**
 * This tool moves the viewport in response to touchpad, touchscreen, mouse, and keyboard events.
 *
 * Which events are handled, and which are skipped, are determined by the tool's `mode`. For example,
 * a `PanZoom` tool with `mode = PanZoomMode.TwoFingerTouchGestures|PanZoomMode.RightClickDrags` would
 * respond to right-click drag events and two-finger touch gestures.
 *
 * @see {@link setModeEnabled}
 */
export default class PanZoom extends BaseTool {
	private transform: ViewportTransform | null = null;

	// Constants
	// initialRotationSnapAngle is larger than afterRotationStartSnapAngle to
	// make it more difficult to start rotating (and easier to continue rotating).
	private readonly initialRotationSnapAngle = 0.22; // radians
	private readonly afterRotationStartSnapAngle = 0.07; // radians
	private readonly pinchZoomStartThreshold = 1.08; // scale factor

	// Distance between two touch points at the **start** of a gesture.
	private startTouchDist: number;

	// Distance between two touch points the last time **this input was used
	// to scale the screen**.
	private lastTouchDist: number;

	// Center of the two touch points at the last time inpput was received
	private lastScreenCenter: Point2;

	// Timestamp (as from performance.now()) at which the last input was received
	private lastTimestamp: number;

	// Last timestamp at which a pointerdown event was received
	private lastPointerDownTimestamp: number = 0;

	private initialTouchAngle: number = 0;
	private initialViewportRotation: number = 0;
	private initialViewportScale: number = 0;

	// Set to `true` only when scaling has started (if two fingers are down and have moved
	// far enough).
	private isScaling: boolean = false;
	private isRotating: boolean = false;

	private inertialScroller: InertialScroller | null = null;
	private velocity: Vec2 | null = null;

	public constructor(
		private editor: Editor,
		private mode: PanZoomMode,
		description: string,
	) {
		super(editor.notifier, description);
	}

	// The pan/zoom tool can be used in a read-only editor.
	public override canReceiveInputInReadOnlyEditor(): boolean {
		return true;
	}

	// Returns information about the pointers in a gesture
	public computePinchData(p1: Pointer, p2: Pointer): PinchData {
		// Swap the pointers to ensure consistent ordering.
		if (p1.id < p2.id) {
			const tmp = p1;
			p1 = p2;
			p2 = tmp;
		}

		const screenBetween = p2.screenPos.minus(p1.screenPos);
		const angle = screenBetween.angle();
		const dist = screenBetween.magnitude();
		const canvasCenter = p2.canvasPos.plus(p1.canvasPos).times(0.5);
		const screenCenter = p2.screenPos.plus(p1.screenPos).times(0.5);

		return { canvasCenter, screenCenter, angle, dist };
	}

	private allPointersAreOfType(pointers: Pointer[], kind: PointerDevice) {
		return pointers.every((pointer) => pointer.device === kind);
	}

	public override onPointerDown({
		allPointers: pointers,
		current: currentPointer,
	}: PointerEvt): boolean {
		let handlingGesture = false;

		const inertialScrollerVelocity = this.inertialScroller?.getCurrentVelocity() ?? Vec2.zero;
		this.inertialScroller?.stop();
		this.velocity = inertialScrollerVelocity;

		this.lastPointerDownTimestamp = currentPointer.timeStamp;

		const isRightClick = this.allPointersAreOfType(pointers, PointerDevice.RightButtonMouse);

		// Work around a Chromium bug where touch events are reported to have unknown type.
		// See https://issues.chromium.org/u/1/issues/428153664.
		const allAreTouch = this.allPointersAreOfType(pointers, PointerDevice.Touch);
		const allAreUnknown = this.allPointersAreOfType(pointers, PointerDevice.Other);
		const allAreProbablyTouch = allAreTouch || allAreUnknown;

		if (
			allAreProbablyTouch &&
			pointers.length === 2 &&
			this.mode & PanZoomMode.TwoFingerTouchGestures
		) {
			const { screenCenter, angle, dist } = this.computePinchData(pointers[0], pointers[1]);
			this.lastTouchDist = dist;
			this.startTouchDist = dist;
			this.lastScreenCenter = screenCenter;
			this.initialTouchAngle = angle;
			this.initialViewportRotation = this.editor.viewport.getRotationAngle();
			this.initialViewportScale = this.editor.viewport.getScaleFactor();
			this.isScaling = false;

			// We're initially rotated if `initialViewportRotation` isn't near a multiple of pi/2.
			// In other words, if sin(2 initialViewportRotation) is near zero.
			this.isRotating = Math.abs(Math.sin(this.initialViewportRotation * 2)) > 1e-3;

			handlingGesture = true;
		} else if (
			pointers.length === 1 &&
			((this.mode & PanZoomMode.OneFingerTouchGestures && allAreTouch) ||
				(isRightClick && this.mode & PanZoomMode.RightClickDrags) ||
				this.mode & PanZoomMode.SinglePointerGestures)
		) {
			this.lastScreenCenter = pointers[0].screenPos;
			this.isScaling = false;

			handlingGesture = true;
		}

		if (handlingGesture) {
			this.lastTimestamp = performance.now();
			this.transform ??= Viewport.transformBy(Mat33.identity);
			this.editor.display.setDraftMode(true);
		}

		return handlingGesture;
	}

	private updateVelocity(currentCenter: Point2) {
		const deltaPos = currentCenter.minus(this.lastScreenCenter);
		let deltaTime = (performance.now() - this.lastTimestamp) / 1000;

		// Ignore duplicate events, unless there has been enough time between them.
		if (deltaPos.magnitude() === 0 && deltaTime < 0.1) {
			return;
		}
		// We divide by deltaTime. Don't divide by zero.
		if (deltaTime === 0) {
			return;
		}

		// Don't divide by almost zero, either
		deltaTime = Math.max(deltaTime, 0.01);

		const currentVelocity = deltaPos.times(1 / deltaTime);
		let smoothedVelocity = currentVelocity;

		if (this.velocity) {
			smoothedVelocity = this.velocity.lerp(currentVelocity, 0.5);
		}

		this.velocity = smoothedVelocity;
	}

	// Returns the change in position of the center of the given group of pointers.
	// Assumes this.lastScreenCenter has been set appropriately.
	private getCenterDelta(screenCenter: Point2): Vec2 {
		// Use transformVec3 to avoid translating the delta
		const delta = this.editor.viewport.screenToCanvasTransform.transformVec3(
			screenCenter.minus(this.lastScreenCenter),
		);
		return delta;
	}

	//  Snaps `angle` to common desired rotations. For example, if `touchAngle` corresponds
	// to a viewport rotation of 90.1 degrees, this function returns a rotation delta that,
	// when applied to the viewport, rotates the viewport to 90.0 degrees.
	//
	// Returns a snapped rotation delta that, when applied to the viewport, rotates the viewport,
	// from its position on the last touchDown event, by `touchAngle - initialTouchAngle`.
	private toSnappedRotationDelta(touchAngle: number) {
		const deltaAngle = touchAngle - this.initialTouchAngle;
		let fullRotation = deltaAngle + this.initialViewportRotation;

		const snapToMultipleOf = Math.PI / 2;
		const roundedFullRotation = Math.round(fullRotation / snapToMultipleOf) * snapToMultipleOf;

		// The maximum angle for which we snap the given angle to a multiple of
		// `snapToMultipleOf`.
		// Use a smaller snap angle if already rotated (to avoid pinch zoom gestures from
		// starting rotation).
		const maxSnapAngle = this.isRotating
			? this.afterRotationStartSnapAngle
			: this.initialRotationSnapAngle;

		// Snap the rotation
		if (Math.abs(fullRotation - roundedFullRotation) < maxSnapAngle) {
			fullRotation = roundedFullRotation;

			// Work around a rotation/matrix multiply bug.
			// (See commit after 4abe27ff8e7913155828f98dee77b09c57c51d30).
			// TODO: Fix the underlying issue and remove this.
			if (fullRotation !== 0) {
				fullRotation += 0.0001;
			}
		}

		return fullRotation - this.editor.viewport.getRotationAngle();
	}

	/**
	 * Given a scale update, `scaleFactor`, returns a new scale factor snapped
	 * to a power of two (if within some tolerance of that scale).
	 */
	private toSnappedScaleFactor(touchDist: number) {
		// scaleFactor is applied to the current transformation of the viewport.
		const newScale = (this.initialViewportScale * touchDist) / this.startTouchDist;
		const currentScale = this.editor.viewport.getScaleFactor();

		const logNewScale = Math.log(newScale) / Math.log(10);
		const roundedLogNewScale = Math.round(logNewScale);

		const logTolerance = 0.04;
		if (Math.abs(roundedLogNewScale - logNewScale) < logTolerance) {
			return Math.pow(10, roundedLogNewScale) / currentScale;
		}

		return touchDist / this.lastTouchDist;
	}

	private handleTwoFingerMove(allPointers: Pointer[]) {
		const { screenCenter, canvasCenter, angle, dist } = this.computePinchData(
			allPointers[0],
			allPointers[1],
		);

		const delta = this.getCenterDelta(screenCenter);
		let deltaRotation;

		if (this.isRotationLocked()) {
			deltaRotation = 0;
		} else {
			deltaRotation = this.toSnappedRotationDelta(angle);
		}

		// If any rotation, make a note of this (affects rotation snap
		// angles).
		if (Math.abs(deltaRotation) > 1e-8) {
			this.isRotating = true;
		}

		this.updateVelocity(screenCenter);

		if (!this.isScaling) {
			const initialScaleFactor = dist / this.startTouchDist;

			// Only start scaling if scaling done so far exceeds some threshold.
			const upperBound = this.pinchZoomStartThreshold;
			const lowerBound = 1 / this.pinchZoomStartThreshold;
			if (initialScaleFactor > upperBound || initialScaleFactor < lowerBound) {
				this.isScaling = true;
			}
		}

		let scaleFactor = 1;
		if (this.isScaling) {
			scaleFactor = this.toSnappedScaleFactor(dist);

			// Don't set lastDist until we start scaling --
			this.lastTouchDist = dist;
		}

		const transformUpdate = Mat33.translation(delta)
			.rightMul(Mat33.scaling2D(scaleFactor, canvasCenter))
			.rightMul(Mat33.zRotation(deltaRotation, canvasCenter));

		this.lastScreenCenter = screenCenter;
		this.transform = Viewport.transformBy(this.transform!.transform.rightMul(transformUpdate));
		return transformUpdate;
	}

	private handleOneFingerMove(pointer: Pointer) {
		const delta = this.getCenterDelta(pointer.screenPos);
		const transformUpdate = Mat33.translation(delta);
		this.updateVelocity(pointer.screenPos);
		this.lastScreenCenter = pointer.screenPos;

		return transformUpdate;
	}

	public override onPointerMove({ allPointers }: PointerEvt): boolean {
		this.transform ??= Viewport.transformBy(Mat33.identity);

		let transformUpdate = Mat33.identity;
		if (allPointers.length === 2) {
			transformUpdate = this.handleTwoFingerMove(allPointers);
		} else if (allPointers.length === 1) {
			transformUpdate = this.handleOneFingerMove(allPointers[0]);
		}

		const result = this.updateTransform(transformUpdate);
		this.lastTimestamp = performance.now();

		return result;
	}

	public override onPointerUp(event: PointerEvt): void {
		const onComplete = () => {
			if (this.transform) {
				this.transform.unapply(this.editor);
				this.editor.dispatch(this.transform, false);
			}

			this.editor.display.setDraftMode(false);
			this.transform = null;
			this.velocity = Vec2.zero;
		};

		const minInertialScrollDt = 30;
		const shouldInertialScroll =
			event.current.device === PointerDevice.Touch &&
			event.allPointers.length === 1 &&
			this.velocity !== null &&
			event.current.timeStamp - this.lastPointerDownTimestamp > minInertialScrollDt;

		if (shouldInertialScroll && this.velocity !== null) {
			const oldVelocity = this.velocity;

			// If the user drags the screen, then stops, then lifts the pointer,
			// we want the final velocity to reflect the stop at the end (so the velocity
			// should be near zero). Handle this:
			this.updateVelocity(event.current.screenPos);

			// Work around an input issue. Some devices that disable the touchscreen when a stylus
			// comes near the screen fire a touch-end event at the position of the stylus when a
			// touch gesture is canceled. Because the stylus is often far away from the last touch,
			// this causes a great displacement between the second-to-last (from the touchscreen) and
			// last (from the pen that is now near the screen) events. Only allow velocity to decrease
			// to work around this:
			if (oldVelocity.magnitude() < this.velocity.magnitude()) {
				this.velocity = oldVelocity;
			}

			// Cancel any ongoing inertial scrolling.
			this.inertialScroller?.stop();

			this.inertialScroller = new InertialScroller(
				this.velocity,
				(scrollDelta: Vec2) => {
					if (!this.transform) {
						return false;
					}

					const canvasDelta =
						this.editor.viewport.screenToCanvasTransform.transformVec3(scrollDelta);

					// Scroll by scrollDelta
					this.transform.unapply(this.editor);
					this.transform = Viewport.transformBy(
						this.transform.transform.rightMul(Mat33.translation(canvasDelta)),
					);
					this.transform.apply(this.editor);

					return true;
				},
				onComplete,
			);
		} else {
			onComplete();
		}
	}

	public override onGestureCancel(): void {
		this.inertialScroller?.stop();
		this.velocity = Vec2.zero;
		this.transform?.unapply(this.editor);
		this.editor.display.setDraftMode(false);
		this.transform = null;
	}

	// Applies [transformUpdate] to the editor. This stacks on top of the
	// current transformation, if it exists.
	//
	// Returns true on success.
	private updateTransform(
		transformUpdate: Mat33,
		{ announce = false }: { announce?: boolean } = {},
	) {
		if (!this.editor.getCurrentSettings().allowOverscroll) {
			const newVisibleRect = this.editor.viewport.visibleRect.transformedBoundingBox(
				transformUpdate.inverse(),
			);
			const imageRect = this.editor.getImportExportRect();

			if (!newVisibleRect.intersects(imageRect)) {
				return false;
			}
		}

		Viewport.transformBy(transformUpdate).apply(this.editor);
		this.transform = Viewport.transformBy(
			(this.transform?.transform ?? Mat33.identity).rightMul(transformUpdate),
		);

		if (announce) {
			this.editor.announceForAccessibility(
				this.transform.description(this.editor, this.editor.localization),
			);
		}

		return true;
	}

	/**
	 * Updates the current transform and clears it. Use this method for events that are not part of
	 * a larger gesture (i.e. have no start and end event). For example, this would be used for `onwheel`
	 * events, but not for `onpointer` events.
	 */
	private applyAndFinalizeTransform(transformUpdate: Mat33) {
		const result = this.updateTransform(transformUpdate, { announce: true });
		this.transform = null;
		return result;
	}

	public override onWheel({ delta, screenPos }: WheelEvt): boolean {
		this.inertialScroller?.stop();

		// Reset the transformation -- wheel events are individual events, so we don't
		// need to unapply/reapply.
		this.transform = Viewport.transformBy(Mat33.identity);

		const canvasPos = this.editor.viewport.screenToCanvas(screenPos);
		const toCanvas = this.editor.viewport.screenToCanvasTransform;

		// Transform without including translation
		const translation = toCanvas.transformVec3(Vec3.of(-delta.x, -delta.y, 0));

		let pinchAmount = delta.z;

		// Clamp the magnitude of pinchAmount
		pinchAmount = Math.atan(pinchAmount / 2) * 2;

		const pinchZoomScaleFactor = 1.04;
		const transformUpdate = Mat33.scaling2D(
			Math.max(0.4, Math.min(Math.pow(pinchZoomScaleFactor, -pinchAmount), 4)),
			canvasPos,
		).rightMul(Mat33.translation(translation));
		return this.applyAndFinalizeTransform(transformUpdate);
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		this.inertialScroller?.stop();

		if (!(this.mode & PanZoomMode.Keyboard)) {
			return false;
		}

		// No need to keep the same the transform for keyboard events.
		this.transform = Viewport.transformBy(Mat33.identity);

		let translation = Vec2.zero;
		let scale = 1;
		let rotation = 0;

		// Keyboard shortcut handling
		const shortcucts = this.editor.shortcuts;
		if (shortcucts.matchesShortcut(moveLeftKeyboardShortcutId, event)) {
			translation = Vec2.of(-1, 0);
		} else if (shortcucts.matchesShortcut(moveRightKeyboardShortcutId, event)) {
			translation = Vec2.of(1, 0);
		} else if (shortcucts.matchesShortcut(moveUpKeyboardShortcutId, event)) {
			translation = Vec2.of(0, -1);
		} else if (shortcucts.matchesShortcut(moveDownKeyboardShortcutId, event)) {
			translation = Vec2.of(0, 1);
		} else if (shortcucts.matchesShortcut(zoomInKeyboardShortcutId, event)) {
			scale = 1 / 2;
		} else if (shortcucts.matchesShortcut(zoomOutKeyboardShortcutId, event)) {
			scale = 2;
		} else if (shortcucts.matchesShortcut(rotateClockwiseKeyboardShortcutId, event)) {
			rotation = 1;
		} else if (shortcucts.matchesShortcut(rotateCounterClockwiseKeyboardShortcutId, event)) {
			rotation = -1;
		} else {
			return false;
		}

		// For each keypress,
		translation = translation.times(30); // Move at most 30 units
		rotation *= Math.PI / 8; // Rotate at least a sixteenth of a rotation

		// Transform the canvas, not the viewport:
		translation = translation.times(-1);
		rotation = rotation * -1;
		scale = 1 / scale;

		// Work around an issue that seems to be related to rotation matrices losing precision on inversion.
		// TODO: Figure out why and implement a better solution.
		if (rotation !== 0) {
			rotation += 0.0001;
		}

		if (this.isRotationLocked()) {
			rotation = 0;
		}

		const toCanvas = this.editor.viewport.screenToCanvasTransform;

		// Transform without translating (treat toCanvas as a linear instead of
		// an affine transformation).
		translation = toCanvas.transformVec3(translation);

		// Rotate/scale about the center of the canvas
		const transformCenter = this.editor.viewport.visibleRect.center;
		const transformUpdate = Mat33.scaling2D(scale, transformCenter)
			.rightMul(Mat33.zRotation(rotation, transformCenter))
			.rightMul(Mat33.translation(translation));
		this.applyAndFinalizeTransform(transformUpdate);

		return this.updateTransform(transformUpdate, { announce: true });
	}

	private isRotationLocked(): boolean {
		return !!(this.mode & PanZoomMode.RotationLocked);
	}

	/**
	 * Changes the types of gestures used by this pan/zoom tool.
	 *
	 * @see {@link PanZoomMode} {@link setMode}
	 *
	 * @example
	 * ```ts,runnable
	 * import { Editor, PanZoomTool, PanZoomMode } from 'js-draw';
	 *
	 * const editor = new Editor(document.body);
	 *
	 * // By default, there are multiple PanZoom tools that handle different events.
	 * // This gets all PanZoomTools.
	 * const panZoomToolList = editor.toolController.getMatchingTools(PanZoomTool);
	 *
	 * // The first PanZoomTool is the highest priority -- by default,
	 * // this tool is responsible for handling multi-finger touch gestures.
	 * //
	 * // Lower-priority PanZoomTools handle one-finger touch gestures and
	 * // key-presses.
	 * const panZoomTool = panZoomToolList[0];
	 *
	 * // Lock rotation for multi-finger touch gestures.
	 * panZoomTool.setModeEnabled(PanZoomMode.RotationLocked, true);
	 * ```
	 */
	public setModeEnabled(mode: PanZoomMode, enabled: boolean) {
		let newMode = this.mode;
		if (enabled) {
			newMode |= mode;
		} else {
			newMode &= ~mode;
		}
		this.setMode(newMode);
	}

	/**
	 * Sets all modes for this tool using a bitmask.
	 *
	 * @see {@link setModeEnabled}
	 *
	 * @example
	 * ```ts
	 * tool.setMode(PanZoomMode.RotationLocked|PanZoomMode.TwoFingerTouchGestures);
	 * ```
	 */
	public setMode(mode: PanZoomMode) {
		if (mode !== this.mode) {
			this.mode = mode;

			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		}
	}

	/**
	 * Returns a bitmask indicating the currently-enabled modes.
	 * @see {@link setModeEnabled}
	 */
	public getMode(): PanZoomMode {
		return this.mode;
	}
}
