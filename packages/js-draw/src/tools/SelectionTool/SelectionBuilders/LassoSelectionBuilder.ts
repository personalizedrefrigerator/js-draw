import { Path, Point2 } from '@js-draw/math';
import Viewport from '../../../Viewport';
import { PathCommandType } from '@js-draw/math';
import { PathCommand } from '@js-draw/math';
import EditorImage from '../../../image/EditorImage';
import AbstractComponent from '../../../components/AbstractComponent';
import SelectionBuilder from './SelectionBuilder';

/**
 * Creates lasso selections.
 */
export default class LassoSelectionBuilder extends SelectionBuilder {
	private boundaryPoints: Point2[] = [];
	private lastPoint: Point2;

	public constructor(
		startPoint: Point2,
		private viewport: Viewport,
	) {
		super();
		this.boundaryPoints.push(startPoint);
		this.lastPoint = startPoint;
	}

	public onPointerMove(canvasPoint: Point2) {
		const lastBoundaryPoint = this.boundaryPoints[this.boundaryPoints.length - 1];

		const minBoundaryDist = this.viewport.getSizeOfPixelOnCanvas() * 8;
		if (lastBoundaryPoint.distanceTo(canvasPoint) >= minBoundaryDist) {
			this.boundaryPoints.push(canvasPoint);
		}

		this.lastPoint = canvasPoint;
	}

	public previewPath() {
		const pathCommands = this.boundaryPoints.map((point): PathCommand => {
			return { kind: PathCommandType.LineTo, point };
		});
		pathCommands.push({
			kind: PathCommandType.LineTo,
			point: this.lastPoint,
		});
		return new Path(this.boundaryPoints[0], pathCommands).asClosed();
	}

	public resolveInternal(image: EditorImage) {
		const path = this.previewPath();
		const lines = path.polylineApproximation();
		const candidates = image.getComponentsIntersecting(path.bbox);

		const componentIsInSelection = (component: AbstractComponent) => {
			if (path.closedContainsRect(component.getExactBBox())) {
				return true;
			}
			let hasKeyPoint = false;
			for (const point of component.keyPoints()) {
				if (path.closedContainsPoint(point)) {
					hasKeyPoint = true;
					break;
				}
			}
			if (!hasKeyPoint) {
				return false;
			}

			// Only select if completely contained within the lasso
			for (const line of lines) {
				if (component.intersects(line)) {
					return false;
				}
			}
			return true;
		};

		return candidates.filter(componentIsInSelection);
	}
}
