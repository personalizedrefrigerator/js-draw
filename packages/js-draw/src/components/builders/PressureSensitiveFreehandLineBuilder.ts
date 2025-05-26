import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import RenderablePathSpec from '../../rendering/RenderablePathSpec';
import {
	Point2,
	Vec2,
	Rect2,
	PathCommand,
	PathCommandType,
	QuadraticBezierPathCommand,
	LinePathCommand,
	QuadraticBezier,
} from '@js-draw/math';
import Stroke from '../Stroke';
import Viewport from '../../Viewport';
import { StrokeDataPoint } from '../../types';
import { ComponentBuilder, ComponentBuilderFactory } from './types';
import RenderingStyle from '../../rendering/RenderingStyle';
import { StrokeSmoother, Curve } from '../util/StrokeSmoother';
import makeShapeFitAutocorrect from './autocorrect/makeShapeFitAutocorrect';

export const makePressureSensitiveFreehandLineBuilder: ComponentBuilderFactory =
	makeShapeFitAutocorrect((initialPoint: StrokeDataPoint, viewport: Viewport) => {
		// Don't smooth if input is more than ± 3 pixels from the true curve, do smooth if
		// less than ±1 px from the curve.
		const maxSmoothingDist = viewport.getSizeOfPixelOnCanvas() * 3;
		const minSmoothingDist = viewport.getSizeOfPixelOnCanvas();

		return new PressureSensitiveFreehandLineBuilder(
			initialPoint,
			minSmoothingDist,
			maxSmoothingDist,
			viewport,
		);
	});

type CurrentSegmentToPathResult = {
	upperCurveCommand: QuadraticBezierPathCommand;
	lowerToUpperConnector: PathCommand;
	upperToLowerConnector: PathCommand;
	lowerCurveCommand: QuadraticBezierPathCommand;

	upperCurve: QuadraticBezier;
	lowerCurve: QuadraticBezier;

	nextCurveStartConnector: PathCommand[];
};

// Handles stroke smoothing and creates Strokes from user/stylus input.
export default class PressureSensitiveFreehandLineBuilder implements ComponentBuilder {
	private isFirstSegment: boolean = true;
	private pathStartConnector: PathCommand[] | null = null;
	private mostRecentConnector: PathCommand | null = null;
	private nextCurveStartConnector: PathCommand[] | null = null;

	//    Beginning of the list of lower parts
	//        ↓
	//        /---pathStartConnector---/ ← Beginning of the list of upper parts
	//    ___/                      __/
	//   /                         /
	//  /--Most recent connector--/ ← most recent upper part goes here
	//  ↑
	//  most recent lower part goes here
	//
	// The upperSegments form a path that goes in reverse from the most recent edge to the
	// least recent edge.
	// The lowerSegments form a path that goes from the least recent edge to the most
	// recent edge.
	private upperSegments: PathCommand[];
	private lowerSegments: PathCommand[];
	private lastUpperBezier: QuadraticBezier | null = null;
	private lastLowerBezier: QuadraticBezier | null = null;
	private parts: RenderablePathSpec[] = [];
	private curveFitter: StrokeSmoother;

	private curveStartWidth: number;

	private bbox: Rect2;

	public constructor(
		private startPoint: StrokeDataPoint,

		// Maximum distance from the actual curve (irrespective of stroke width)
		// for which a point is considered 'part of the curve'.
		// Note that the maximum will be smaller if the stroke width is less than
		// [maxFitAllowed].
		private minFitAllowed: number,
		maxFitAllowed: number,

		private viewport: Viewport,
	) {
		this.upperSegments = [];
		this.lowerSegments = [];

		this.curveFitter = new StrokeSmoother(startPoint, minFitAllowed, maxFitAllowed, (curve) =>
			this.addCurve(curve),
		);

		this.curveStartWidth = startPoint.width;
		this.bbox = new Rect2(this.startPoint.pos.x, this.startPoint.pos.y, 0, 0);
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	private getRenderingStyle(): RenderingStyle {
		return {
			fill: this.startPoint.color ?? null,
		};
	}

	private previewCurrentPath(extendWithLatest: boolean = true): RenderablePathSpec | null {
		const upperPath = this.upperSegments.slice();
		const lowerPath = this.lowerSegments.slice();
		let lowerToUpperCap: PathCommand;
		let pathStartConnector: PathCommand[];

		const currentCurve = this.curveFitter.preview();
		if (currentCurve && extendWithLatest) {
			const { upperCurveCommand, lowerToUpperConnector, upperToLowerConnector, lowerCurveCommand } =
				this.segmentToPath(currentCurve);

			upperPath.push(upperCurveCommand);
			lowerPath.push(lowerCurveCommand);

			lowerToUpperCap = lowerToUpperConnector;
			pathStartConnector = this.pathStartConnector ?? [upperToLowerConnector];
		} else {
			if (this.mostRecentConnector === null || this.pathStartConnector === null) {
				return null;
			}

			lowerToUpperCap = this.mostRecentConnector;
			pathStartConnector = this.pathStartConnector;
		}

		let startPoint: Point2;
		const lastLowerSegment = lowerPath[lowerPath.length - 1];
		if (
			lastLowerSegment.kind === PathCommandType.LineTo ||
			lastLowerSegment.kind === PathCommandType.MoveTo
		) {
			startPoint = lastLowerSegment.point;
		} else {
			startPoint = lastLowerSegment.endPoint;
		}

		return {
			// Start at the end of the lower curve:
			//    Start point
			//     ↓
			//  __/  __/ ← Most recent points on this end
			// /___ /
			//  ↑
			//  Oldest points
			startPoint,

			commands: [
				// Move to the most recent point on the upperPath:
				//     ----→•
				//  __/  __/
				// /___ /
				lowerToUpperCap,

				// Move to the beginning of the upperPath:
				//  __/  __/
				// /___ /
				//     • ←-
				...upperPath.reverse(),

				// Move to the beginning of the lowerPath:
				//  __/  __/
				// /___ /
				// •
				...pathStartConnector,

				// Move back to the start point:
				//     •
				//  __/  __/
				// /___ /
				...lowerPath,
			],
			style: this.getRenderingStyle(),
		};
	}

	private previewFullPath(): RenderablePathSpec[] | null {
		const preview = this.previewCurrentPath();
		if (preview) {
			return [...this.parts, preview];
		}
		return null;
	}

	public preview(renderer: AbstractRenderer) {
		const paths = this.previewFullPath();
		if (paths) {
			const approxBBox = this.viewport.visibleRect;
			renderer.startObject(approxBBox);
			for (const path of paths) {
				renderer.drawPath(path);
			}
			renderer.endObject();
		}
	}

	public build(): Stroke {
		this.curveFitter.finalizeCurrentCurve();
		if (this.isFirstSegment) {
			// Ensure we have something.
			this.addCurve(null);
		}

		return new Stroke(this.previewFullPath()!);
	}

	private roundPoint(point: Point2): Point2 {
		let minFit = Math.min(this.minFitAllowed, this.curveStartWidth / 3);

		if (minFit < 1e-10) {
			minFit = this.minFitAllowed;
		}

		return Viewport.roundPoint(point, minFit);
	}

	// Returns true if, due to overlap with previous segments, a new RenderablePathSpec should be created.
	private shouldStartNewSegment(lowerCurve: QuadraticBezier, upperCurve: QuadraticBezier): boolean {
		if (!this.lastLowerBezier || !this.lastUpperBezier) {
			return false;
		}

		const getIntersection = (curve1: QuadraticBezier, curve2: QuadraticBezier): Point2 | null => {
			const intersections = curve1.intersectsBezier(curve2);
			if (!intersections.length) return null;
			return intersections[0].point;
		};

		const getExitDirection = (curve: QuadraticBezier): Vec2 => {
			return curve.p2.minus(curve.p1).normalized();
		};

		const getEnterDirection = (curve: QuadraticBezier): Vec2 => {
			return curve.p1.minus(curve.p0).normalized();
		};

		// Prevent
		//         /
		//       / /
		//      /  /  /|
		//    /    /   |
		//  /          |
		// where the next stroke and the previous stroke are in different directions.
		//
		// Are the exit/enter directions of the previous and current curves in different enough directions?
		if (
			getEnterDirection(upperCurve).dot(getExitDirection(this.lastUpperBezier)) < 0.35 ||
			getEnterDirection(lowerCurve).dot(getExitDirection(this.lastLowerBezier)) < 0.35 ||
			// Also handle if the curves exit/enter directions differ
			getEnterDirection(upperCurve).dot(getExitDirection(upperCurve)) < 0 ||
			getEnterDirection(lowerCurve).dot(getExitDirection(lowerCurve)) < 0
		) {
			return true;
		}

		// Check whether the lower curve intersects the other wall:
		//       /    / ← lower
		//    / /   /
		// /   / /
		//   //
		// / /
		const lowerIntersection = getIntersection(lowerCurve, this.lastUpperBezier);
		const upperIntersection = getIntersection(upperCurve, this.lastLowerBezier);
		if (lowerIntersection || upperIntersection) {
			return true;
		}

		return false;
	}

	private getCurrentRadius() {
		return Viewport.roundPoint(
			this.startPoint.width / 2.2,
			Math.min(this.minFitAllowed, this.startPoint.width / 4),
		);
	}

	private addCurve(curve: Curve | null) {
		// Case where no points have been added
		if (!curve) {
			// Don't create a circle around the initial point if the stroke has more than one point.
			if (!this.isFirstSegment) {
				return;
			}

			const radius = this.getCurrentRadius();
			const center = this.roundPoint(this.startPoint.pos);

			// Start on the right, cycle clockwise:
			//    |
			//  ----- ←
			//    |
			const startPoint = this.startPoint.pos.plus(Vec2.of(radius, 0));

			// Draw a circle-ish shape around the start point
			this.lowerSegments.push(
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(radius, radius)),

					// Bottom of the circle
					//    |
					//  -----
					//    |
					//    ↑
					endPoint: center.plus(Vec2.of(0, radius)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(-radius, radius)),
					endPoint: center.plus(Vec2.of(-radius, 0)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(-radius, -radius)),
					endPoint: center.plus(Vec2.of(0, -radius)),
				},
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: center.plus(Vec2.of(radius, -radius)),
					endPoint: center.plus(Vec2.of(radius, 0)),
				},
			);
			const connector: PathCommand = {
				kind: PathCommandType.LineTo,
				point: startPoint,
			};
			this.pathStartConnector = [connector];
			this.mostRecentConnector = connector;

			return;
		}

		const {
			upperCurveCommand,
			lowerToUpperConnector,
			upperToLowerConnector,
			lowerCurveCommand,
			lowerCurve,
			upperCurve,
			nextCurveStartConnector,
		} = this.segmentToPath(curve);

		let shouldStartNew = this.shouldStartNewSegment(lowerCurve, upperCurve);

		if (shouldStartNew) {
			const part = this.previewCurrentPath(false);

			if (part) {
				this.parts.push(part);
				this.upperSegments = [];
				this.lowerSegments = [];
			} else {
				shouldStartNew = false;
			}
		}

		if (this.isFirstSegment || shouldStartNew) {
			// We draw the upper path (reversed), then the lower path, so we need the
			// upperToLowerConnector to join the two paths.
			this.pathStartConnector = this.nextCurveStartConnector ?? [upperToLowerConnector];
			this.isFirstSegment = false;
		}
		// With the most recent connector, we're joining the end of the lowerPath to the most recent
		// upperPath:
		this.mostRecentConnector = lowerToUpperConnector;
		this.nextCurveStartConnector = nextCurveStartConnector;

		this.lowerSegments.push(lowerCurveCommand);
		this.upperSegments.push(upperCurveCommand);

		this.lastLowerBezier = lowerCurve;
		this.lastUpperBezier = upperCurve;
		this.curveStartWidth = curve.startWidth;
	}

	// Returns [upper curve, connector, lower curve]
	private segmentToPath(curve: Curve): CurrentSegmentToPathResult {
		const bezier = new QuadraticBezier(curve.startPoint, curve.controlPoint, curve.endPoint);
		let startVec = bezier.normal(0);
		let endVec = bezier.normal(1);

		startVec = startVec.times(curve.startWidth / 2);
		endVec = endVec.times(curve.endWidth / 2);

		if (!isFinite(startVec.magnitude())) {
			console.error('Warning: startVec is NaN or ∞', startVec, endVec, curve);
			startVec = endVec;
		}

		const startPt = curve.startPoint;
		const endPt = curve.endPoint;
		const controlPoint = curve.controlPoint;

		// Approximate the normal at the location of the control point
		const projectionT = bezier.nearestPointTo(controlPoint).parameterValue;

		const halfVecT = projectionT;
		const halfVec = bezier
			.normal(halfVecT)
			.times((curve.startWidth / 2) * halfVecT + (curve.endWidth / 2) * (1 - halfVecT));

		// Each starts at startPt ± startVec
		const lowerCurveStartPoint = this.roundPoint(startPt.plus(startVec));
		const lowerCurveControlPoint = this.roundPoint(controlPoint.plus(halfVec));
		const lowerCurveEndPoint = this.roundPoint(endPt.plus(endVec));
		const upperCurveControlPoint = this.roundPoint(controlPoint.minus(halfVec));
		const upperCurveStartPoint = this.roundPoint(endPt.minus(endVec));
		const upperCurveEndPoint = this.roundPoint(startPt.minus(startVec));

		const lowerCurveCommand: QuadraticBezierPathCommand = {
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: lowerCurveControlPoint,
			endPoint: lowerCurveEndPoint,
		};

		// From the end of the upperCurve to the start of the lowerCurve:
		const upperToLowerConnector: LinePathCommand = {
			kind: PathCommandType.LineTo,
			point: lowerCurveStartPoint,
		};

		// From the end of lowerCurve to the start of upperCurve:
		const lowerToUpperConnector: LinePathCommand = {
			kind: PathCommandType.LineTo,
			point: upperCurveStartPoint,
		};

		// The segment to be used to start the next path (to insert to connect the start of its
		// lower and the end of its upper).
		const nextCurveStartConnector: LinePathCommand[] = [
			{
				kind: PathCommandType.LineTo,
				point: upperCurveStartPoint,
			},
			{
				kind: PathCommandType.LineTo,
				point: lowerCurveEndPoint,
			},
		];

		const upperCurveCommand: QuadraticBezierPathCommand = {
			kind: PathCommandType.QuadraticBezierTo,
			controlPoint: upperCurveControlPoint,
			endPoint: upperCurveEndPoint,
		};

		const upperCurve = new QuadraticBezier(
			upperCurveStartPoint,
			upperCurveControlPoint,
			upperCurveEndPoint,
		);
		const lowerCurve = new QuadraticBezier(
			lowerCurveStartPoint,
			lowerCurveControlPoint,
			lowerCurveEndPoint,
		);

		return {
			upperCurveCommand,
			upperToLowerConnector,
			lowerToUpperConnector,
			lowerCurveCommand,
			upperCurve,
			lowerCurve,

			nextCurveStartConnector,
		};
	}

	public addPoint(newPoint: StrokeDataPoint) {
		this.curveFitter.addPoint(newPoint);
	}
}
