import { Point2, Rect2, Vec2 } from '@js-draw/math';
import Viewport from '../../Viewport';
import untilNextAnimationFrame from '../../util/untilNextAnimationFrame';

type ScrollByCallback = (delta: Vec2)=>void;

/**
 * Automatically scrolls the viewport such that the user's pointer is visible.
 */
export default class ToPointerAutoscroller {
	private started: boolean = false;
	private updateLoopId: number = 0;
	private updateLoopRunning = false;
	private targetPoint: Point2|null = null;
	private scrollRate: number = 400; // px/s

	public constructor(private viewport: Viewport, private scrollByCanvasDelta: ScrollByCallback) {
	}

	private getScrollForPoint(screenPoint: Point2) {
		const screenSize = this.viewport.getScreenRectSize();
		const screenRect = new Rect2(0, 0, screenSize.x, screenSize.y);
		const closestEdgePoint = screenRect.getClosestPointOnBoundaryTo(screenPoint);
		const distToEdge = closestEdgePoint.minus(screenPoint).magnitude();

		const isWithinScreen = screenRect.containsPoint(screenPoint);

		// Only scroll if within the outer 15px of the viewport
		const minScrollDist = 15;
		if (distToEdge > minScrollDist && isWithinScreen) {
			return Vec2.zero;
		}

		let toEdge = screenPoint.minus(closestEdgePoint);
		if (toEdge.eq(Vec2.zero)) {
			// Grow such that the point is no longer on the edge
			const grownRect = screenRect.grownBy(1);
			const closestEdgePoint = grownRect.getClosestPointOnBoundaryTo(screenPoint);

			toEdge = screenPoint.minus(closestEdgePoint);
		}
		else if (!isWithinScreen) {
			toEdge = toEdge.times(-1);
		}

		// Go faster for points closer to the edge (or outside of the screen).
		let scaleFactor = 4;
		if (isWithinScreen) {
			const fractionToEdge = (minScrollDist - distToEdge) / minScrollDist;
			scaleFactor = fractionToEdge * scaleFactor;
		}

		return toEdge.normalizedOrZero().times(scaleFactor);
	}

	public start() {
		this.started = true;
	}

	public onPointerMove(pointerScreenPosition: Point2) {
		if (!this.started) {
			return;
		}

		if (this.getScrollForPoint(pointerScreenPosition) === Vec2.zero) {
			this.stopUpdateLoop();
		} else {
			this.targetPoint = pointerScreenPosition;
			this.startUpdateLoop();
		}
	}

	public stop() {
		this.targetPoint = null;
		this.started = false;
		this.stopUpdateLoop();
	}

	private startUpdateLoop() {
		if (this.updateLoopRunning) {
			return;
		}

		(async () => {
			this.updateLoopId ++;
			const currentUpdateLoopId = this.updateLoopId;

			let lastUpdateTime = performance.now();

			while (this.updateLoopId === currentUpdateLoopId && this.targetPoint) {
				this.updateLoopRunning = true;
				const currentTime = performance.now();
				const deltaTimeMs = currentTime - lastUpdateTime;

				const scrollDirection = this.getScrollForPoint(this.targetPoint);
				const screenScrollAmount = scrollDirection.times(this.scrollRate * deltaTimeMs / 1000);

				this.scrollByCanvasDelta(
					this.viewport.screenToCanvasTransform.transformVec3(screenScrollAmount)
				);

				lastUpdateTime = currentTime;
				await untilNextAnimationFrame();
			}

			this.updateLoopRunning = false;
		})();
	}

	private stopUpdateLoop() {
		this.updateLoopId ++;
	}
}