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
	private scrollRate: number = 800; // px/s

	public constructor(private viewport: Viewport, private scrollByCanvasDelta: ScrollByCallback) {
	}

	private getScrollForPoint(screenPoint: Point2) {
		const screenSize = this.viewport.getScreenRectSize();
		const screenRect = new Rect2(0, 0, screenSize.x, screenSize.y);

		// Starts autoscrolling when the cursor is **outside of** this region
		const marginSize = 30;
		const autoscrollBoundary = screenRect.grownBy(-marginSize);

		if (autoscrollBoundary.containsPoint(screenPoint)) {
			return Vec2.zero;
		}

		const closestEdgePoint = autoscrollBoundary.getClosestPointOnBoundaryTo(screenPoint);
		const distToEdge = closestEdgePoint.minus(screenPoint).magnitude();

		const toEdge = closestEdgePoint.minus(screenPoint);

		// Go faster for points further away from the boundary.
		// * 1.25: Reach the maximum scroll rate before hitting the edge.
		const scaleFactor = Math.min(2, distToEdge / marginSize);

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