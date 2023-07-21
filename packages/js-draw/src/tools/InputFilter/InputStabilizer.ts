import { GestureCancelEvt, InputEvt, InputEvtType, PointerEvt, PointerMoveEvt, isPointerEvt } from '../../inputEvents';
import InputMapper from './InputMapper';
import Viewport from '../../Viewport';
import Editor from '../../Editor';
import { Point2, Vec2 } from '../../math/Vec2';
import untilNextAnimationFrame from '../../util/untilNextAnimationFrame';

interface InputStabilizerOptions {
	mass: number;
	springConstant: number;
	frictionCoefficient: number;

	maxPointDist: number;

	minSimilarityToFinalize: number;
}

const defaultOptions: InputStabilizerOptions = {
	mass: 0.4, // kg
	springConstant: 100.0, // N/m
	frictionCoefficient: 0.28,

	maxPointDist: 10, // screen units

	minSimilarityToFinalize: 0.6,
};

// Stabilizes input for a single cursor
class StylusInputStabilizer {
	private runLoop: boolean = true;
	private lastUpdateTime: number = 0;
	private targetInterval: number;
	private velocity: Vec2 = Vec2.zero;

	private strokePoint: Point2;
	private targetPoint: Point2;

	public constructor(
		// The initial starting point of the pointer.
		start: Point2,

		// Emits a pointer motion event, returns true if the event was handled.
		private updatePointer: (screenPoint: Point2, timeStamp: number)=>boolean,

		private readonly options: InputStabilizerOptions
	) {
		this.strokePoint = start;
		this.targetPoint = start;
		this.targetInterval = 10; // ms
		void this.loop();
	}

	private async loop() {
		this.lastUpdateTime = Date.now();
		while (this.runLoop) {
			this.update(false);
			await untilNextAnimationFrame();
		}
	}

	public setTarget(point: Point2) {
		this.targetPoint = point;
	}

	private getNextVelocity(deltaTimeMs: number) {
		const toTarget = this.targetPoint.minus(this.strokePoint);

		const springForce = toTarget.times(this.options.springConstant);

		const normalForceMagnitude = this.options.mass * 9.81;
		const frictionForce = this.velocity.normalizedOrZero().times(
			-this.options.frictionCoefficient * normalForceMagnitude * 2
		);
		const acceleration = (springForce.plus(frictionForce)).times(1/this.options.mass);

		const decayFactor = 0.1;
		const springVelocity = this.velocity.times(1 - decayFactor).plus(acceleration.times(deltaTimeMs / 1000));

		// An alternate velocity that goes directly towards the target.
		const toTargetVelocity = toTarget.normalizedOrZero().times(springVelocity.length());

		return springVelocity.lerp(toTargetVelocity, 0.25);
	}

	public update(force: boolean): boolean {
		const nowTime = Date.now();
		const deltaTime = nowTime - this.lastUpdateTime;

		const reachedTarget = this.strokePoint.eq(this.targetPoint);

		if (deltaTime > this.targetInterval || force) {
			if (!reachedTarget) {
				let velocity: Vec2;
				let deltaX: Vec2;
				let parts = 1;

				do {
					velocity = this.getNextVelocity(deltaTime / parts);
					deltaX = velocity.times(deltaTime / 1000);

					parts ++;
				} while (deltaX.magnitude() > this.options.maxPointDist && parts < 10);

				for (let i = 0; i < parts; i++) {
					this.velocity = this.getNextVelocity(deltaTime / parts);
					deltaX = this.velocity.times(deltaTime / 1000);
					this.strokePoint = this.strokePoint.plus(deltaX);

					// Allows the last updatePointer to be returned.
					if (i < parts - 1) {
						this.updatePointer(this.strokePoint, nowTime);
					}
				}
			}

			// Even if we have reached the target, ensure that lastUpdateTime is updated
			// (prevent large deltaTime).
			this.lastUpdateTime = nowTime;

			if (force || !reachedTarget) {
				return this.updatePointer(this.strokePoint, nowTime);
			}
		}

		return false;
	}

	/** Finalizes the current stroke. */
	public finish() {
		this.runLoop = false;

		const toTarget = this.targetPoint.minus(this.strokePoint);
		if (this.velocity.dot(toTarget) > this.options.minSimilarityToFinalize) {
			// Connect the stroke to its end point
			this.updatePointer(this.targetPoint, Date.now());
		}
	}

	public cancel() {
		this.runLoop = false;
	}
}

export default class InputStabilizer extends InputMapper {
	private stabilizer: StylusInputStabilizer|null = null;
	private lastPointerEvent: PointerEvt|null = null;

	public constructor(
		private viewport: Viewport,
		private readonly options: InputStabilizerOptions = defaultOptions,
	) {
		super();
	}

	private mapPointerEvent(event: PointerEvt|GestureCancelEvt) {
		if (isPointerEvt(event)) {
			this.lastPointerEvent = event;
		}

		// Only apply smoothing if there is a single pointer.
		if (event.kind === InputEvtType.GestureCancelEvt || event.allPointers.length > 1 || this.stabilizer === null) {
			return this.emit(event);
		}

		this.stabilizer.setTarget(event.current.screenPos);

		if (event.kind === InputEvtType.PointerMoveEvt) {
			return this.stabilizer.update(true);
		} else if (event.kind === InputEvtType.PointerUpEvt) {
			this.stabilizer.finish();
			return this.emit(event);
		} else {
			return this.emit(event);
		}
	}

	// Assumes that there is exactly one pointer that is currently down.
	private emitPointerMove(screenPoint: Point2, timeStamp: number) {
		if (!this.lastPointerEvent) {
			return false;
		}

		const pointer = this.lastPointerEvent.current
			.withScreenPosition(screenPoint, this.viewport)
			.withTimestamp(timeStamp);

		const event: PointerMoveEvt = {
			kind: InputEvtType.PointerMoveEvt,
			current: pointer,
			allPointers: [ pointer ],
		};

		const handled = this.emit(event);
		return handled;
	}

	public override onEvent(event: InputEvt): boolean {
		if (isPointerEvt(event) || event.kind === InputEvtType.GestureCancelEvt
		) {
			if (event.kind === InputEvtType.PointerDownEvt) {
				if (this.stabilizer === null) {
					this.stabilizer = new StylusInputStabilizer(
						event.current.screenPos,
						(screenPoint, timeStamp) => this.emitPointerMove(screenPoint, timeStamp),
						this.options,
					);
				} else if (event.allPointers.length > 1) {
					// Do not attempt to stabilize multiple pointers.
					this.stabilizer.cancel();
					this.stabilizer = null;
				}
			}

			const handled = this.mapPointerEvent(event);

			if (event.kind === InputEvtType.PointerUpEvt || event.kind === InputEvtType.GestureCancelEvt) {
				this.stabilizer?.cancel();
				this.stabilizer = null;
			}

			return handled;
		}

		return this.emit(event);
	}

	public static fromEditor(editor: Editor) {
		return new InputStabilizer(editor.viewport);
	}
}
