import Pointer from '../../Pointer';
import { Vec2 } from '@js-draw/math';

interface Config {
	// The pointer must have speed below this value to be considered stationary.
	// In px/s.
	maxSpeed: number;

	// The minimum amount of time (seconds) for the pointer to
	// be considered stationary.
	minTimeSeconds: number;

	// The pointer must be within twice this radius of other pointer events
	// in the last `minTime` to be considered stationary.
	maxRadius: number;
}

type OnStationaryCallback = (lastPointer: Pointer)=>void;

export default class StationaryPenDetector {
	// Stores the pointer of the last event or, if the pen hasn't moved
	// significantly, the first pointer event, away from which the pen hasn't moved.
	private stationaryStartPointer: Pointer;
	private lastPointer: Pointer;
	private averageVelocity: Vec2;

	private timeout: ReturnType<typeof setTimeout>|null = null;

	// Only handles one pen. As such, `startPointer` should be the same device/finger
	// as `updatedPointer` in `onPointerMove`.
	//
	// A new `StationaryPenDetector` should be created for each gesture.
	public constructor(
		startPointer: Pointer,
		private config: Config,
		private onStationary: OnStationaryCallback,
	) {
		this.stationaryStartPointer = startPointer;
		this.lastPointer = startPointer;
		this.averageVelocity = Vec2.zero;
	}

	// Returns true if stationary
	public onPointerMove(currentPointer: Pointer) {
		if (currentPointer.id !== this.stationaryStartPointer.id) {
			return false;
		}

		// dx: "Δx" Displacement from last.
		const dxFromLast = currentPointer.screenPos.minus(this.lastPointer.screenPos);
		const dxFromStationaryStart = currentPointer.screenPos.minus(this.stationaryStartPointer.screenPos);

		// dt: Delta time:
		// /1000: Convert to s.
		let dtFromLast = (currentPointer.timeStamp - this.lastPointer.timeStamp) / 1000; // s

		// Don't divide by zero
		if (dtFromLast === 0) {
			dtFromLast = 1;
		}

		const currentVelocity = dxFromLast.times(1/dtFromLast); // px/s

		// Slight smoothing of the velocity to prevent input jitter from affecting the
		// velocity too significantly.
		this.averageVelocity = this.averageVelocity.lerp(currentVelocity, 0.5); // px/s

		const dtFromStart = currentPointer.timeStamp - this.stationaryStartPointer.timeStamp; // ms

		// If not stationary
		if (
			dxFromStationaryStart.length() > this.config.maxRadius
			|| this.averageVelocity.length() > this.config.maxSpeed
			|| dtFromStart < this.config.minTimeSeconds
		) {
			this.stationaryStartPointer = currentPointer;
			this.lastPointer = currentPointer;

			this.setStationaryTimeout(this.config.minTimeSeconds * 1000);

			return false;
		}

		const stationaryTimeoutMs = this.config.minTimeSeconds * 1000 - dtFromStart;

		this.lastPointer = currentPointer;
		return stationaryTimeoutMs <= 0;
	}

	public onPointerUp(pointer: Pointer) {
		if (pointer.id !== this.stationaryStartPointer.id) {
			this.cancelStationaryTimeout();
		}
	}

	public cancel() {
		this.cancelStationaryTimeout();
	}

	private cancelStationaryTimeout() {
		if (this.timeout !== null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}

	private setStationaryTimeout(timeoutMs: number) {
		if (this.timeout !== null) {
			return;
		}

		if (timeoutMs <= 0) {
			this.onStationary(this.lastPointer);
		} else {
			this.timeout = setTimeout(() => {
				this.timeout = null;

				const timeSinceStationaryStart = performance.now() - this.stationaryStartPointer.timeStamp;
				const timeRemaining = this.config.minTimeSeconds * 1000 - timeSinceStationaryStart;
				if (timeRemaining <= 0) {
					this.onStationary(this.lastPointer);
				} else {
					this.setStationaryTimeout(timeRemaining);
				}
			}, timeoutMs);
		}
	}
}
