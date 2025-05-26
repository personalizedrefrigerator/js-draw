import LineSegment2 from './LineSegment2';
import Mat33 from '../Mat33';
import Rect2 from './Rect2';
import { Point2, Vec2 } from '../Vec2';
import CubicBezier from './CubicBezier';
import QuadraticBezier from './QuadraticBezier';
import PointShape2D from './PointShape2D';
import toRoundedString from '../rounding/toRoundedString';
import toStringOfSamePrecision from '../rounding/toStringOfSamePrecision';
import Parameterized2DShape from './Parameterized2DShape';
import BezierJSWrapper from './BezierJSWrapper';
import convexHull2Of from '../utils/convexHull2Of';

/** Identifiers for different path commands. These commands can make up a {@link Path}. */
export enum PathCommandType {
	LineTo,
	MoveTo,
	CubicBezierTo,
	QuadraticBezierTo,
}

export interface CubicBezierPathCommand {
	kind: PathCommandType.CubicBezierTo;
	controlPoint1: Point2;
	controlPoint2: Point2;
	endPoint: Point2;
}

export interface QuadraticBezierPathCommand {
	kind: PathCommandType.QuadraticBezierTo;
	controlPoint: Point2;
	endPoint: Point2;
}

export interface LinePathCommand {
	kind: PathCommandType.LineTo;
	point: Point2;
}

export interface MoveToPathCommand {
	kind: PathCommandType.MoveTo;
	point: Point2;
}

export type PathCommand =
	| CubicBezierPathCommand
	| QuadraticBezierPathCommand
	| MoveToPathCommand
	| LinePathCommand;

export interface IntersectionResult {
	// @internal
	curve: Parameterized2DShape;
	// @internal
	curveIndex: number;

	/** Parameter value for the closest point **on** the path to the intersection. @internal */
	parameterValue: number;

	/** Point at which the intersection occured. */
	point: Point2;
}

/** Options for {@link Path.splitNear} and {@link Path.splitAt} */
export interface PathSplitOptions {
	/**
	 * Allows mapping points on newly added segments. This is useful, for example,
	 * to round points to prevent long decimals when later saving.
	 */
	mapNewPoint?: (point: Point2) => Point2;
}

/**
 * Allows indexing a particular part of a path.
 *
 * @see {@link Path.at} {@link Path.tangentAt}
 */
export interface CurveIndexRecord {
	curveIndex: number;
	parameterValue: number;
}

/** Returns a positive number if `a` comes after `b`, 0 if equal, and negative otherwise. */
export const compareCurveIndices = (a: CurveIndexRecord, b: CurveIndexRecord) => {
	const indexCompare = a.curveIndex - b.curveIndex;
	if (indexCompare === 0) {
		return a.parameterValue - b.parameterValue;
	} else {
		return indexCompare;
	}
};

/**
 * Returns a version of `index` with its parameter value incremented by `stepBy`
 * (which can be either positive or negative).
 */
export const stepCurveIndexBy = (index: CurveIndexRecord, stepBy: number): CurveIndexRecord => {
	if (index.parameterValue + stepBy > 1) {
		return { curveIndex: index.curveIndex + 1, parameterValue: index.parameterValue + stepBy - 1 };
	}
	if (index.parameterValue + stepBy < 0) {
		if (index.curveIndex === 0) {
			return { curveIndex: 0, parameterValue: 0 };
		}
		return { curveIndex: index.curveIndex - 1, parameterValue: index.parameterValue + stepBy + 1 };
	}

	return { curveIndex: index.curveIndex, parameterValue: index.parameterValue + stepBy };
};

/**
 * Represents a union of lines and curves.
 *
 * To create a path from a string, see {@link fromString}.
 *
 * @example
 * ```ts,runnable,console
 * import {Path, Mat33, Vec2, LineSegment2} from '@js-draw/math';
 *
 * // Creates a path from an SVG path string.
 * // In this case,
 * // 1. Move to (0,0)
 * // 2. Line to (100,0)
 * const path = Path.fromString('M0,0 L100,0');
 *
 * // Logs the distance from (10,0) to the curve 1 unit
 * // away from path. This curve forms a stroke with the path at
 * // its center.
 * const strokeRadius = 1;
 * console.log(path.signedDistance(Vec2.of(10,0), strokeRadius));
 *
 * // Log a version of the path that's scaled by a factor of 4.
 * console.log(path.transformedBy(Mat33.scaling2D(4)).toString());
 *
 * // Log all intersections of a stroked version of the path with
 * // a vertical line segment.
 * // (Try removing the `strokeRadius` parameter).
 * const segment = new LineSegment2(Vec2.of(5, -100), Vec2.of(5, 100));
 * console.log(path.intersection(segment, strokeRadius).map(i => i.point));
 * ```
 */
export class Path {
	/**
	 * A rough estimate of the bounding box of the path.
	 * A slight overestimate.
	 * See {@link getExactBBox}
	 */
	public readonly bbox: Rect2;

	/** The individual shapes that make up this path. */
	public readonly parts: Readonly<PathCommand>[];

	/**
	 * Creates a new `Path` that starts at `startPoint` and is made up of the path commands,
	 * `parts`.
	 *
	 * See also {@link fromString}
	 */
	public constructor(
		public readonly startPoint: Point2,
		parts: Readonly<PathCommand>[],
	) {
		this.parts = parts;

		// Initial bounding box contains one point: the start point.
		this.bbox = Rect2.bboxOf([startPoint]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of this.parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(startPoint, part));
		}
	}

	/**
	 * Computes and returns the full bounding box for this path.
	 *
	 * If a slight over-estimate of a path's bounding box is sufficient, use
	 * {@link bbox} instead.
	 */
	public getExactBBox(): Rect2 {
		const bboxes: Rect2[] = [];
		for (const part of this.geometry) {
			bboxes.push(part.getTightBoundingBox());
		}

		return Rect2.union(...bboxes);
	}

	private cachedGeometry: Parameterized2DShape[] | null = null;

	// Lazy-loads and returns this path's geometry
	public get geometry(): Parameterized2DShape[] {
		if (this.cachedGeometry) {
			return this.cachedGeometry;
		}

		let startPoint = this.startPoint;
		const geometry: Parameterized2DShape[] = [];

		for (const part of this.parts) {
			let exhaustivenessCheck: never;

			switch (part.kind) {
				case PathCommandType.CubicBezierTo:
					geometry.push(
						new CubicBezier(startPoint, part.controlPoint1, part.controlPoint2, part.endPoint),
					);
					startPoint = part.endPoint;
					break;
				case PathCommandType.QuadraticBezierTo:
					geometry.push(new QuadraticBezier(startPoint, part.controlPoint, part.endPoint));
					startPoint = part.endPoint;
					break;
				case PathCommandType.LineTo:
					geometry.push(new LineSegment2(startPoint, part.point));
					startPoint = part.point;
					break;
				case PathCommandType.MoveTo:
					geometry.push(new PointShape2D(part.point));
					startPoint = part.point;
					break;
				default:
					exhaustivenessCheck = part;
					return exhaustivenessCheck;
			}
		}

		this.cachedGeometry = geometry;
		return this.cachedGeometry;
	}

	/**
	 * Iterates through the start/end points of each component in this path.
	 *
	 * If a start point is equivalent to the end point of the previous segment,
	 * the point is **not** emitted twice.
	 */
	public *startEndPoints() {
		yield this.startPoint;

		for (const part of this.parts) {
			let exhaustivenessCheck: never;

			switch (part.kind) {
				case PathCommandType.CubicBezierTo:
					yield part.endPoint;
					break;
				case PathCommandType.QuadraticBezierTo:
					yield part.endPoint;
					break;
				case PathCommandType.LineTo:
					yield part.point;
					break;
				case PathCommandType.MoveTo:
					yield part.point;
					break;
				default:
					exhaustivenessCheck = part;
					return exhaustivenessCheck;
			}
		}
	}

	private cachedPolylineApproximation: LineSegment2[] | null = null;

	// Approximates this path with a group of line segments.
	public polylineApproximation(): LineSegment2[] {
		if (this.cachedPolylineApproximation) {
			return this.cachedPolylineApproximation;
		}

		const points: Point2[] = [];

		for (const part of this.parts) {
			switch (part.kind) {
				case PathCommandType.CubicBezierTo:
					points.push(part.controlPoint1, part.controlPoint2, part.endPoint);
					break;
				case PathCommandType.QuadraticBezierTo:
					points.push(part.controlPoint, part.endPoint);
					break;
				case PathCommandType.MoveTo:
				case PathCommandType.LineTo:
					points.push(part.point);
					break;
			}
		}

		const result: LineSegment2[] = [];
		let prevPoint = this.startPoint;
		for (const point of points) {
			result.push(new LineSegment2(prevPoint, point));
			prevPoint = point;
		}

		return result;
	}

	public static computeBBoxForSegment(startPoint: Point2, part: PathCommand): Rect2 {
		const points = [startPoint];
		let exhaustivenessCheck: never;
		switch (part.kind) {
			case PathCommandType.MoveTo:
			case PathCommandType.LineTo:
				points.push(part.point);
				break;
			case PathCommandType.CubicBezierTo:
				points.push(part.controlPoint1, part.controlPoint2, part.endPoint);
				break;
			case PathCommandType.QuadraticBezierTo:
				points.push(part.controlPoint, part.endPoint);
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
		}

		return Rect2.bboxOf(points);
	}

	/**
	 * Returns the signed distance between `point` and a curve `strokeRadius` units
	 * away from this path.
	 *
	 * This returns the **signed distance**, which means that points inside this shape
	 * have their distance negated. For example,
	 * ```ts,runnable,console
	 * import {Path, Vec2} from '@js-draw/math';
	 * console.log(Path.fromString('m0,0 L100,0').signedDistance(Vec2.zero, 1));
	 * ```
	 * would print `-1` because (0,0) is on `m0,0 L100,0` and thus one unit away from its boundary.
	 *
	 * **Note**: `strokeRadius = strokeWidth / 2`
	 */
	public signedDistance(point: Point2, strokeRadius: number) {
		let minDist = Infinity;

		for (const part of this.geometry) {
			const currentDist = part.signedDistance(point) - strokeRadius;
			if (currentDist < minDist) {
				minDist = currentDist;
			}
		}

		return minDist;
	}

	/**
	 * Let `S` be a closed path a distance `strokeRadius` from this path.
	 *
	 * @returns Approximate intersections of `line` with `S` using ray marching, starting from
	 * 	        both end points of `line` and each point in `additionalRaymarchStartPoints`.
	 */
	private raymarchIntersectionWith(
		line: LineSegment2,
		strokeRadius: number,
		additionalRaymarchStartPoints: Point2[] = [],
	): IntersectionResult[] {
		// No intersection between bounding boxes: No possible intersection
		// of the interior.
		if (!line.bbox.intersects(this.bbox.grownBy(strokeRadius))) {
			return [];
		}

		const lineLength = line.length;

		type DistanceFunction = (point: Point2) => number;
		type DistanceFunctionRecord = {
			part: Parameterized2DShape;
			bbox: Rect2;
			distFn: DistanceFunction;
		};
		const partDistFunctionRecords: DistanceFunctionRecord[] = [];

		// Determine distance functions for all parts that the given line could possibly intersect with
		for (const part of this.geometry) {
			const bbox = part.getTightBoundingBox().grownBy(strokeRadius);
			if (!bbox.intersects(line.bbox)) {
				continue;
			}

			// Signed distance function
			const partDist: DistanceFunction = (point) => part.signedDistance(point);

			// Part signed distance function (negative result implies `point` is
			// inside the shape).
			const partSdf = (point: Point2) => partDist(point) - strokeRadius;

			// If the line can't possibly intersect the part,
			if (partSdf(line.p1) > lineLength && partSdf(line.p2) > lineLength) {
				continue;
			}

			partDistFunctionRecords.push({
				part,
				distFn: partDist,
				bbox,
			});
		}

		// If no distance functions, there are no intersections.
		if (partDistFunctionRecords.length === 0) {
			return [];
		}

		// Returns the minimum distance to a part in this stroke, where only parts that the given
		// line could intersect are considered.
		const sdf = (point: Point2): [Parameterized2DShape | null, number] => {
			let minDist = Infinity;
			let minDistPart: Parameterized2DShape | null = null;

			const uncheckedDistFunctions: DistanceFunctionRecord[] = [];

			// First pass: only curves for which the current point is inside
			// the bounding box.
			for (const distFnRecord of partDistFunctionRecords) {
				const { part, distFn, bbox } = distFnRecord;

				// Check later if the current point isn't in the bounding box.
				if (!bbox.containsPoint(point)) {
					uncheckedDistFunctions.push(distFnRecord);
					continue;
				}

				const currentDist = distFn(point);

				if (currentDist <= minDist) {
					minDist = currentDist;
					minDistPart = part;
				}
			}

			// Second pass: Everything else
			for (const { part, distFn, bbox } of uncheckedDistFunctions) {
				// Skip if impossible for the distance to the target to be lesser than
				// the current minimum.
				if (isFinite(minDist) && !bbox.grownBy(minDist).containsPoint(point)) {
					continue;
				}

				const currentDist = distFn(point);

				if (currentDist <= minDist) {
					minDist = currentDist;
					minDistPart = part;
				}
			}

			return [minDistPart, minDist - strokeRadius];
		};

		// Raymarch:
		const maxRaymarchSteps = 8;

		// Start raymarching from each of these points. This allows detection of multiple
		// intersections.
		const startPoints = [line.p1, ...additionalRaymarchStartPoints, line.p2];

		// Converts a point ON THE LINE to a parameter
		const pointToParameter = (point: Point2) => {
			// Because line.direction is a unit vector, this computes the length
			// of the projection of the vector(line.p1->point) onto line.direction.
			//
			// Note that this can be negative if the given point is outside of the given
			// line segment.
			return point.minus(line.p1).dot(line.direction);
		};

		// Sort start points by parameter on the line.
		// This allows us to determine whether the current value of a parameter
		// drops down to a value already tested.
		startPoints.sort((a, b) => {
			const t_a = pointToParameter(a);
			const t_b = pointToParameter(b);

			// Sort in increasing order
			return t_a - t_b;
		});

		const result: IntersectionResult[] = [];

		const stoppingThreshold = strokeRadius / 1000;

		// Returns the maximum parameter value explored
		const raymarchFrom = (
			startPoint: Point2,

			// Direction to march in (multiplies line.direction)
			directionMultiplier: -1 | 1,

			// Terminate if the current point corresponds to a parameter
			// below this.
			minimumLineParameter: number,
		): number | null => {
			let currentPoint = startPoint;
			let [lastPart, lastDist] = sdf(currentPoint);
			let lastParameter = pointToParameter(currentPoint);

			if (lastDist > lineLength) {
				return lastParameter;
			}

			const direction = line.direction.times(directionMultiplier);

			for (let i = 0; i < maxRaymarchSteps; i++) {
				// Step in the direction of the edge of the shape.
				const step = lastDist;
				currentPoint = currentPoint.plus(direction.times(step));
				lastParameter = pointToParameter(currentPoint);

				// If we're below the minimum parameter, stop. We've already tried
				// this.
				if (lastParameter <= minimumLineParameter) {
					return lastParameter;
				}

				const [currentPart, signedDist] = sdf(currentPoint);

				// Ensure we're stepping in the correct direction.
				// Note that because we could start with a negative distance and work towards a
				// positive distance, we need absolute values here.
				if (Math.abs(signedDist) > Math.abs(lastDist)) {
					// If not, stop.
					return null;
				}

				lastDist = signedDist;
				lastPart = currentPart;

				// Is the distance close enough that we can stop early?
				if (Math.abs(lastDist) < stoppingThreshold) {
					break;
				}
			}

			// Ensure that the point we ended with is on the line.
			const isOnLineSegment = lastParameter >= 0 && lastParameter <= lineLength;

			if (lastPart && isOnLineSegment && Math.abs(lastDist) < stoppingThreshold) {
				result.push({
					point: currentPoint,
					parameterValue: lastPart.nearestPointTo(currentPoint).parameterValue,
					curve: lastPart,
					curveIndex: this.geometry.indexOf(lastPart),
				});

				// Slightly increase the parameter value to prevent the same point from being
				// added to the results twice.
				const parameterIncrease = strokeRadius / 20 / line.length;
				lastParameter += isFinite(parameterIncrease) ? parameterIncrease : 0;
			}

			return lastParameter;
		};

		// The maximum value of the line's parameter explored so far (0 corresponds to
		// line.p1)
		let maxLineT = 0;

		// Raymarch for each start point.
		//
		// Use a for (i from 0 to length) loop because startPoints may be added
		// during iteration.
		for (let i = 0; i < startPoints.length; i++) {
			const startPoint = startPoints[i];

			// Try raymarching in both directions.
			maxLineT = Math.max(maxLineT, raymarchFrom(startPoint, 1, maxLineT) ?? maxLineT);
			maxLineT = Math.max(maxLineT, raymarchFrom(startPoint, -1, maxLineT) ?? maxLineT);
		}

		return result;
	}

	/**
	 * Returns a list of intersections with this path. If `strokeRadius` is given,
	 * intersections are approximated with the surface `strokeRadius` away from this.
	 *
	 * If `strokeRadius > 0`, the resultant `parameterValue` has no defined value.
	 *
	 * **Note**: `strokeRadius` is half of a stroke's width.
	 */
	public intersection(line: LineSegment2, strokeRadius?: number): IntersectionResult[] {
		let result: IntersectionResult[] = [];

		// Is any intersection between shapes within the bounding boxes impossible?
		if (!line.bbox.intersects(this.bbox.grownBy(strokeRadius ?? 0))) {
			return [];
		}

		if (this.parts.length === 0) {
			return new Path(this.startPoint, [
				{ kind: PathCommandType.MoveTo, point: this.startPoint },
			]).intersection(line, strokeRadius);
		}

		let index = 0;
		for (const part of this.geometry) {
			const intersections = part.argIntersectsLineSegment(line);

			for (const intersection of intersections) {
				result.push({
					curve: part,
					curveIndex: index,
					point: part.at(intersection),
					parameterValue: intersection,
				});
			}

			index++;
		}

		// If given a non-zero strokeWidth, attempt to raymarch.
		// Even if raymarching, we need to collect starting points.
		// We use the above-calculated intersections for this.
		const doRaymarching = strokeRadius && strokeRadius > 1e-8;
		if (doRaymarching) {
			// Starting points for raymarching (in addition to the end points of the line).
			const startPoints = result.map((intersection) => intersection.point);
			result = this.raymarchIntersectionWith(line, strokeRadius, startPoints);
		}

		return result;
	}

	/**
	 * @returns the nearest point on this path to the given `point`.
	 */
	public nearestPointTo(point: Point2): IntersectionResult {
		// Find the closest point on this
		let closestSquareDist = Infinity;
		let closestPartIndex = 0;
		let closestParameterValue = 0;
		let closestPoint: Point2 = this.startPoint;

		for (let i = 0; i < this.geometry.length; i++) {
			const current = this.geometry[i];
			const nearestPoint = current.nearestPointTo(point);
			const sqareDist = nearestPoint.point.squareDistanceTo(point);
			if (i === 0 || sqareDist < closestSquareDist) {
				closestPartIndex = i;
				closestSquareDist = sqareDist;
				closestParameterValue = nearestPoint.parameterValue;
				closestPoint = nearestPoint.point;
			}
		}

		return {
			curve: this.geometry[closestPartIndex],
			curveIndex: closestPartIndex,
			parameterValue: closestParameterValue,
			point: closestPoint,
		};
	}

	public at(index: CurveIndexRecord) {
		if (index.curveIndex === 0 && index.parameterValue === 0) {
			return this.startPoint;
		}
		return this.geometry[index.curveIndex].at(index.parameterValue);
	}

	public tangentAt(index: CurveIndexRecord) {
		return this.geometry[index.curveIndex].tangentAt(index.parameterValue);
	}

	/** Splits this path in two near the given `point`. */
	public splitNear(point: Point2, options?: PathSplitOptions) {
		const nearest = this.nearestPointTo(point);
		return this.splitAt(nearest, options);
	}

	/**
	 * Returns a copy of this path with `deleteFrom` until `deleteUntil` replaced with `insert`.
	 *
	 * This method is analogous to {@link Array.toSpliced}.
	 */
	public spliced(
		deleteFrom: CurveIndexRecord,
		deleteTo: CurveIndexRecord,
		insert: Path | undefined,
		options?: PathSplitOptions,
	): Path {
		const isBeforeOrEqual = (a: CurveIndexRecord, b: CurveIndexRecord) => {
			return (
				a.curveIndex < b.curveIndex ||
				(a.curveIndex === b.curveIndex && a.parameterValue <= b.parameterValue)
			);
		};

		if (isBeforeOrEqual(deleteFrom, deleteTo)) {
			//          deleteFrom        deleteTo
			//      <---------|             |-------------->
			//      x                                      x
			//  startPoint                             endPoint
			const firstSplit = this.splitAt(deleteFrom, options);
			const secondSplit = this.splitAt(deleteTo, options);
			const before = firstSplit[0];
			const after = secondSplit[secondSplit.length - 1];
			return insert ? before.union(insert).union(after) : before.union(after);
		} else {
			// In this case, we need to handle wrapping at the start/end.
			//          deleteTo        deleteFrom
			//      <---------|    keep     |-------------->
			//      x                                      x
			//  startPoint                             endPoint
			const splitAtFrom = this.splitAt([deleteFrom], options);
			const beforeFrom = splitAtFrom[0];

			// We need splitNear, rather than splitAt, because beforeFrom does not have
			// the same indexing as this.
			const splitAtTo = beforeFrom.splitNear(this.at(deleteTo), options);

			const betweenBoth = splitAtTo[splitAtTo.length - 1];
			return insert ? betweenBoth.union(insert) : betweenBoth;
		}
	}

	public splitAt(at: CurveIndexRecord, options?: PathSplitOptions): [Path] | [Path, Path];
	public splitAt(at: CurveIndexRecord[], options?: PathSplitOptions): Path[];

	// @internal
	public splitAt(
		splitAt: CurveIndexRecord[] | CurveIndexRecord,
		options?: PathSplitOptions,
	): Path[] {
		if (!Array.isArray(splitAt)) {
			splitAt = [splitAt];
		}

		splitAt = [...splitAt];
		splitAt.sort(compareCurveIndices);

		//
		// Bounds checking & reversal.
		//

		while (
			splitAt.length > 0 &&
			splitAt[splitAt.length - 1].curveIndex >= this.parts.length - 1 &&
			splitAt[splitAt.length - 1].parameterValue >= 1
		) {
			splitAt.pop();
		}

		splitAt.reverse(); // .reverse() <-- We're `.pop`ing from the end

		while (
			splitAt.length > 0 &&
			splitAt[splitAt.length - 1].curveIndex <= 0 &&
			splitAt[splitAt.length - 1].parameterValue <= 0
		) {
			splitAt.pop();
		}

		if (splitAt.length === 0 || this.parts.length === 0) {
			return [this];
		}

		const expectedSplitCount = splitAt.length + 1;
		const mapNewPoint = options?.mapNewPoint ?? ((p: Point2) => p);

		const result: Path[] = [];
		let currentStartPoint = this.startPoint;
		let currentPath: PathCommand[] = [];

		//
		// Splitting
		//

		let { curveIndex, parameterValue } = splitAt.pop()!;

		for (let i = 0; i < this.parts.length; i++) {
			if (i !== curveIndex) {
				currentPath.push(this.parts[i]);
			} else {
				let part = this.parts[i];
				let geom = this.geometry[i];
				while (i === curveIndex) {
					let newPathStart: Point2;
					const newPath: PathCommand[] = [];

					switch (part.kind) {
						case PathCommandType.MoveTo:
							currentPath.push({
								kind: part.kind,
								point: part.point,
							});
							newPathStart = part.point;
							break;
						case PathCommandType.LineTo:
							{
								const split = (geom as LineSegment2).splitAt(parameterValue);
								currentPath.push({
									kind: part.kind,
									point: mapNewPoint(split[0].p2),
								});
								newPathStart = split[0].p2;
								if (split.length > 1) {
									console.assert(split.length === 2);
									newPath.push({
										kind: part.kind,

										// Don't map: For lines, the end point of the split is
										// the same as the end point of the original:
										point: split[1]!.p2,
									});
									geom = split[1]!;
								}
							}
							break;
						case PathCommandType.QuadraticBezierTo:
						case PathCommandType.CubicBezierTo:
							{
								const split = (geom as BezierJSWrapper).splitAt(parameterValue);
								let isFirstPart = split.length === 2;
								for (const segment of split) {
									geom = segment;
									const targetArray = isFirstPart ? currentPath : newPath;
									const controlPoints = segment.getPoints();
									if (part.kind === PathCommandType.CubicBezierTo) {
										targetArray.push({
											kind: part.kind,
											controlPoint1: mapNewPoint(controlPoints[1]),
											controlPoint2: mapNewPoint(controlPoints[2]),
											endPoint: mapNewPoint(controlPoints[3]),
										});
									} else {
										targetArray.push({
											kind: part.kind,
											controlPoint: mapNewPoint(controlPoints[1]),
											endPoint: mapNewPoint(controlPoints[2]),
										});
									}

									// We want the start of the new path to match the start of the
									// FIRST Bézier in the NEW path.
									if (!isFirstPart) {
										newPathStart = controlPoints[0];
									}
									isFirstPart = false;
								}
							}
							break;
						default: {
							const exhaustivenessCheck: never = part;
							return exhaustivenessCheck;
						}
					}

					result.push(new Path(currentStartPoint, [...currentPath]));
					currentStartPoint = mapNewPoint(newPathStart!);
					console.assert(!!currentStartPoint, 'should have a start point');
					currentPath = newPath;
					part = newPath[newPath.length - 1] ?? part;

					const nextSplit = splitAt.pop();
					if (!nextSplit) {
						break;
					} else {
						curveIndex = nextSplit.curveIndex;
						if (i === curveIndex) {
							const originalPoint = this.at(nextSplit);
							parameterValue = geom.nearestPointTo(originalPoint).parameterValue;
							currentPath = [];
						} else {
							parameterValue = nextSplit.parameterValue;
						}
					}
				}
			}
		}

		result.push(new Path(currentStartPoint, currentPath));

		console.assert(
			result.length === expectedSplitCount,
			`should split into splitAt.length + 1 splits (was ${result.length}, expected ${expectedSplitCount})`,
		);
		return result;
	}

	/**
	 * Replaces all `MoveTo` commands with `LineTo` commands and connects the end point of this
	 * path to the start point.
	 */
	public asClosed() {
		const newParts: PathCommand[] = [];
		let hasChanges = false;
		for (const part of this.parts) {
			if (part.kind === PathCommandType.MoveTo) {
				newParts.push({
					kind: PathCommandType.LineTo,
					point: part.point,
				});
				hasChanges = true;
			} else {
				newParts.push(part);
			}
		}
		if (!this.getEndPoint().eq(this.startPoint)) {
			newParts.push({
				kind: PathCommandType.LineTo,
				point: this.startPoint,
			});
			hasChanges = true;
		}

		if (!hasChanges) {
			return this;
		}

		const result = new Path(this.startPoint, newParts);
		console.assert(result.getEndPoint().eq(result.startPoint));
		return result;
	}

	private static mapPathCommand(
		part: PathCommand,
		mapping: (point: Point2) => Point2,
	): PathCommand {
		switch (part.kind) {
			case PathCommandType.MoveTo:
			case PathCommandType.LineTo:
				return {
					kind: part.kind,
					point: mapping(part.point),
				};
				break;
			case PathCommandType.CubicBezierTo:
				return {
					kind: part.kind,
					controlPoint1: mapping(part.controlPoint1),
					controlPoint2: mapping(part.controlPoint2),
					endPoint: mapping(part.endPoint),
				};
				break;
			case PathCommandType.QuadraticBezierTo:
				return {
					kind: part.kind,
					controlPoint: mapping(part.controlPoint),
					endPoint: mapping(part.endPoint),
				};
				break;
		}

		const exhaustivenessCheck: never = part;
		return exhaustivenessCheck;
	}

	public mapPoints(mapping: (point: Point2) => Point2): Path {
		const startPoint = mapping(this.startPoint);
		const newParts: PathCommand[] = [];

		for (const part of this.parts) {
			newParts.push(Path.mapPathCommand(part, mapping));
		}

		return new Path(startPoint, newParts);
	}

	public transformedBy(affineTransfm: Mat33): Path {
		if (affineTransfm.isIdentity()) {
			return this;
		}

		return this.mapPoints((point) => affineTransfm.transformVec2(point));
	}

	/**
	 * @internal -- TODO: This method may have incorrect output in some cases.
	 */
	public closedContainsPoint(point: Point2) {
		const bbox = this.getExactBBox();
		if (!bbox.containsPoint(point)) {
			return false;
		}

		const pointOutside = point.plus(Vec2.of(bbox.width, 0));
		const asClosed = this.asClosed();

		const lineToOutside = new LineSegment2(point, pointOutside);

		const intersections = asClosed.intersection(lineToOutside);
		const filteredIntersections = intersections.filter((intersection, index) => {
			if (index === 0) return true; // No previous
			const previousIntersection = intersections[index - 1];
			const isRepeatedIntersection =
				previousIntersection.parameterValue >= 1 && intersection.parameterValue <= 0;
			return !isRepeatedIntersection;
		});
		return filteredIntersections.length % 2 === 1;
	}

	/**
	 * @returns `true` if this path (interpreted as a closed path) contains the given rectangle.
	 */
	public closedContainsRect(rect: Rect2) {
		if (!this.bbox.containsRect(rect)) return false;
		if (!rect.corners.every((corner) => this.closedContainsPoint(corner))) return false;

		for (const edge of rect.getEdges()) {
			if (this.intersection(edge).length) {
				return false;
			}
		}

		return true;
	}

	// Creates a new path by joining [other] to the end of this path
	public union(
		other: Path | PathCommand[] | null,

		// allowReverse: true iff reversing other or this is permitted if it means
		//               no moveTo command is necessary when unioning the paths.
		options: { allowReverse?: boolean } = { allowReverse: true },
	): Path {
		if (!other) {
			return this;
		}
		if (Array.isArray(other)) {
			return new Path(this.startPoint, [...this.parts, ...other]);
		}

		const thisEnd = this.getEndPoint();

		let newParts: Readonly<PathCommand>[] = [];
		if (thisEnd.eq(other.startPoint)) {
			newParts = this.parts.concat(other.parts);
		} else if (options.allowReverse && this.startPoint.eq(other.getEndPoint())) {
			return other.union(this, { allowReverse: false });
		} else if (options.allowReverse && this.startPoint.eq(other.startPoint)) {
			return this.union(other.reversed(), { allowReverse: false });
		} else {
			newParts = [
				...this.parts,
				{
					kind: PathCommandType.MoveTo,
					point: other.startPoint,
				},
				...other.parts,
			];
		}
		return new Path(this.startPoint, newParts);
	}

	/**
	 * @returns a version of this path with the direction reversed.
	 *
	 * Example:
	 * ```ts,runnable,console
	 * import {Path} from '@js-draw/math';
	 * console.log(Path.fromString('m0,0l1,1').reversed()); // -> M1,1 L0,0
	 * ```
	 */
	public reversed() {
		const newStart = this.getEndPoint();
		const newParts: Readonly<PathCommand>[] = [];
		let lastPoint: Point2 = this.startPoint;
		for (const part of this.parts) {
			switch (part.kind) {
				case PathCommandType.LineTo:
				case PathCommandType.MoveTo:
					newParts.push({
						kind: part.kind,
						point: lastPoint,
					});
					lastPoint = part.point;
					break;
				case PathCommandType.CubicBezierTo:
					newParts.push({
						kind: part.kind,
						controlPoint1: part.controlPoint2,
						controlPoint2: part.controlPoint1,
						endPoint: lastPoint,
					});
					lastPoint = part.endPoint;
					break;
				case PathCommandType.QuadraticBezierTo:
					newParts.push({
						kind: part.kind,
						controlPoint: part.controlPoint,
						endPoint: lastPoint,
					});
					lastPoint = part.endPoint;
					break;
				default: {
					const exhaustivenessCheck: never = part;
					return exhaustivenessCheck;
				}
			}
		}
		newParts.reverse();
		return new Path(newStart, newParts);
	}

	/** Computes and returns the end point of this path */
	public getEndPoint() {
		if (this.parts.length === 0) {
			return this.startPoint;
		}
		const lastPart = this.parts[this.parts.length - 1];
		if (
			lastPart.kind === PathCommandType.QuadraticBezierTo ||
			lastPart.kind === PathCommandType.CubicBezierTo
		) {
			return lastPart.endPoint;
		} else {
			return lastPart.point;
		}
	}

	/**
	 * Like {@link closedRoughlyIntersects} except takes stroke width into account.
	 *
	 * This is intended to be a very fast and rough approximation. Use {@link intersection}
	 * and {@link signedDistance} for more accurate (but much slower) intersection calculations.
	 *
	 * **Note**: Unlike other methods, this accepts `strokeWidth` (and not `strokeRadius`).
	 *
	 * `strokeRadius` is half of `strokeWidth`.
	 */
	public roughlyIntersects(rect: Rect2, strokeWidth: number = 0) {
		if (this.parts.length === 0) {
			return rect.containsPoint(this.startPoint);
		}
		const isClosed = this.startPoint.eq(this.getEndPoint());

		if (isClosed && strokeWidth === 0) {
			return this.closedRoughlyIntersects(rect);
		}

		if (rect.containsRect(this.bbox)) {
			return true;
		}

		// Does the rectangle intersect the bounding boxes of any of this' parts?
		let startPoint = this.startPoint;
		for (const part of this.parts) {
			const bbox = Path.computeBBoxForSegment(startPoint, part).grownBy(strokeWidth);

			if (part.kind === PathCommandType.LineTo || part.kind === PathCommandType.MoveTo) {
				startPoint = part.point;
			} else {
				startPoint = part.endPoint;
			}

			if (rect.intersects(bbox)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Treats this as a closed path and returns true if part of `rect` is *roughly* within
	 * this path's interior.
	 *
	 * **Note**: Assumes that this is a closed, non-self-intersecting path.
	 */
	public closedRoughlyIntersects(rect: Rect2): boolean {
		if (rect.containsRect(this.bbox)) {
			return true;
		}

		// Choose a point outside of the path.
		const startPt = this.bbox.topLeft.minus(Vec2.of(1, 1));
		const testPts = rect.corners;
		const polygon = this.polylineApproximation();

		for (const point of testPts) {
			const testLine = new LineSegment2(point, startPt);

			let intersectionCount = 0;
			for (const line of polygon) {
				if (line.intersects(testLine)) {
					intersectionCount++;
				}
			}

			// Odd? The point is within the polygon!
			if (intersectionCount % 2 === 1) {
				return true;
			}
		}

		// Grow the rectangle for possible additional precision.
		const grownRect = rect.grownBy(Math.min(rect.size.x, rect.size.y));
		const edges: LineSegment2[] = [];
		for (const subrect of grownRect.divideIntoGrid(4, 4)) {
			edges.push(...subrect.getEdges());
		}

		for (const edge of edges) {
			for (const line of polygon) {
				if (edge.intersects(line)) {
					return true;
				}
			}
		}

		// Even? Probably no intersection.
		return false;
	}

	/** @returns true if all points on this are equivalent to the points on `other` */
	public eq(other: Path, tolerance?: number) {
		if (other.parts.length !== this.parts.length) {
			return false;
		}

		for (let i = 0; i < this.parts.length; i++) {
			const part1 = this.parts[i];
			const part2 = other.parts[i];

			switch (part1.kind) {
				case PathCommandType.LineTo:
				case PathCommandType.MoveTo:
					if (part1.kind !== part2.kind) {
						return false;
					} else if (!part1.point.eq(part2.point, tolerance)) {
						return false;
					}
					break;
				case PathCommandType.CubicBezierTo:
					if (part1.kind !== part2.kind) {
						return false;
					} else if (
						!part1.controlPoint1.eq(part2.controlPoint1, tolerance) ||
						!part1.controlPoint2.eq(part2.controlPoint2, tolerance) ||
						!part1.endPoint.eq(part2.endPoint, tolerance)
					) {
						return false;
					}
					break;
				case PathCommandType.QuadraticBezierTo:
					if (part1.kind !== part2.kind) {
						return false;
					} else if (
						!part1.controlPoint.eq(part2.controlPoint, tolerance) ||
						!part1.endPoint.eq(part2.endPoint, tolerance)
					) {
						return false;
					}
					break;
				default: {
					const exhaustivenessCheck: never = part1;
					return exhaustivenessCheck;
				}
			}
		}

		return true;
	}

	/**
	 * Returns a path that outlines `rect`.
	 *
	 * If `lineWidth` is given, the resultant path traces a `lineWidth` thick
	 * border around `rect`. Otherwise, the resultant path is just the border
	 * of `rect`.
	 */
	public static fromRect(rect: Rect2, lineWidth: number | null = null): Path {
		const commands: PathCommand[] = [];

		let corners;
		let startPoint;

		if (lineWidth !== null) {
			// Vector from the top left corner or bottom right corner to the edge of the
			// stroked region.
			const cornerToEdge = Vec2.of(lineWidth, lineWidth).times(0.5);
			const innerRect = Rect2.fromCorners(
				rect.topLeft.plus(cornerToEdge),
				rect.bottomRight.minus(cornerToEdge),
			);
			const outerRect = Rect2.fromCorners(
				rect.topLeft.minus(cornerToEdge),
				rect.bottomRight.plus(cornerToEdge),
			);

			corners = [innerRect.corners[3], ...innerRect.corners, ...outerRect.corners.reverse()];
			startPoint = outerRect.corners[3];
		} else {
			corners = rect.corners.slice(1);
			startPoint = rect.corners[0];
		}

		for (const corner of corners) {
			commands.push({
				kind: PathCommandType.LineTo,
				point: corner,
			});
		}

		// Close the shape
		commands.push({
			kind: PathCommandType.LineTo,
			point: startPoint,
		});

		return new Path(startPoint, commands);
	}

	private cachedStringVersion: string | null = null;

	/**
	 * Convert to an [SVG path representation](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths).
	 *
	 * If `useNonAbsCommands` is given, relative path commands (e.g. `l10,0`) are to be used instead of
	 * absolute commands (e.g. `L10,0`).
	 *
	 * See also {@link fromString}.
	 */
	public toString(useNonAbsCommands?: boolean, ignoreCache: boolean = false): string {
		if (this.cachedStringVersion && !ignoreCache) {
			return this.cachedStringVersion;
		}

		if (useNonAbsCommands === undefined) {
			// Hueristic: Try to determine whether converting absolute to relative commands is worth it.
			useNonAbsCommands = Math.abs(this.bbox.topLeft.x) > 10 && Math.abs(this.bbox.topLeft.y) > 10;
		}

		const result = Path.toString(this.startPoint, this.parts, !useNonAbsCommands);
		this.cachedStringVersion = result;
		return result;
	}

	public serialize(): string {
		return this.toString();
	}

	// @param onlyAbsCommands - True if we should avoid converting absolute coordinates to relative offsets -- such
	//   conversions can lead to smaller output strings, but also take time.
	public static toString(
		startPoint: Point2,
		parts: PathCommand[],
		onlyAbsCommands?: boolean,
	): string {
		const result: string[] = [];

		let prevPoint: Point2 | undefined;
		const addCommand = (command: string, ...points: Point2[]) => {
			const absoluteCommandParts: string[] = [];
			const relativeCommandParts: string[] = [];
			const makeAbsCommand = !prevPoint || onlyAbsCommands;
			const roundedPrevX = prevPoint ? toRoundedString(prevPoint.x) : '';
			const roundedPrevY = prevPoint ? toRoundedString(prevPoint.y) : '';

			for (const point of points) {
				const xComponent = toRoundedString(point.x);
				const yComponent = toRoundedString(point.y);

				// Relative commands are often shorter as strings than absolute commands.
				if (!makeAbsCommand) {
					const xComponentRelative = toStringOfSamePrecision(
						point.x - prevPoint!.x,
						xComponent,
						roundedPrevX,
						roundedPrevY,
					);
					const yComponentRelative = toStringOfSamePrecision(
						point.y - prevPoint!.y,
						yComponent,
						roundedPrevX,
						roundedPrevY,
					);

					// No need for an additional separator if it starts with a '-'
					if (yComponentRelative.charAt(0) === '-') {
						relativeCommandParts.push(`${xComponentRelative}${yComponentRelative}`);
					} else {
						relativeCommandParts.push(`${xComponentRelative},${yComponentRelative}`);
					}
				} else {
					absoluteCommandParts.push(`${xComponent},${yComponent}`);
				}
			}

			let commandString;
			if (makeAbsCommand) {
				commandString = `${command}${absoluteCommandParts.join(' ')}`;
			} else {
				commandString = `${command.toLowerCase()}${relativeCommandParts.join(' ')}`;
			}

			// Don't add no-ops.
			if (commandString === 'l0,0' || commandString === 'm0,0') {
				return;
			}
			result.push(commandString);

			if (points.length > 0) {
				prevPoint = points[points.length - 1];
			}
		};

		// Don't add two moveTos in a row (this can happen if
		// the start point corresponds to a moveTo _and_ the first command is
		// also a moveTo)
		if (parts[0]?.kind !== PathCommandType.MoveTo) {
			addCommand('M', startPoint);
		}

		let exhaustivenessCheck: never;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];

			switch (part.kind) {
				case PathCommandType.MoveTo:
					addCommand('M', part.point);
					break;
				case PathCommandType.LineTo:
					addCommand('L', part.point);
					break;
				case PathCommandType.CubicBezierTo:
					addCommand('C', part.controlPoint1, part.controlPoint2, part.endPoint);
					break;
				case PathCommandType.QuadraticBezierTo:
					addCommand('Q', part.controlPoint, part.endPoint);
					break;
				default:
					exhaustivenessCheck = part;
					return exhaustivenessCheck;
			}
		}

		return result.join('');
	}

	/**
	 * Create a `Path` from a subset of the SVG path specification.
	 *
	 * Currently, this does not support elliptical arcs or `s` and `t` command
	 * shorthands. See https://github.com/personalizedrefrigerator/js-draw/pull/19.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Path } from '@js-draw/math';
	 *
	 * const path = Path.fromString('m0,0l100,100');
	 * console.log(path.toString(true)); // true: Prefer relative to absolute path commands
	 * ```
	 */
	public static fromString(pathString: string): Path {
		// TODO: Support elliptical arcs, and the `s`, `t` command shorthands.
		//
		// See the MDN reference:
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
		// and
		// https://www.w3.org/TR/SVG2/paths.html

		// Remove linebreaks
		pathString = pathString.split('\n').join(' ');

		let lastPos: Point2 = Vec2.zero;
		let firstPos: Point2 | null = null;
		let startPos: Point2 | null = null;
		let isFirstCommand: boolean = true;
		const commands: PathCommand[] = [];

		const moveTo = (point: Point2) => {
			// The first moveTo/lineTo is already handled by the [startPoint] parameter of the Path constructor.
			if (isFirstCommand) {
				isFirstCommand = false;
				return;
			}

			commands.push({
				kind: PathCommandType.MoveTo,
				point,
			});
		};
		const lineTo = (point: Point2) => {
			if (isFirstCommand) {
				isFirstCommand = false;
				return;
			}

			commands.push({
				kind: PathCommandType.LineTo,
				point,
			});
		};
		const cubicBezierTo = (cp1: Point2, cp2: Point2, end: Point2) => {
			commands.push({
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: cp1,
				controlPoint2: cp2,
				endPoint: end,
			});
		};
		const quadraticBeierTo = (controlPoint: Point2, endPoint: Point2) => {
			commands.push({
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint,
				endPoint,
			});
		};
		const commandArgCounts: Record<string, number> = {
			m: 1,
			l: 1,
			c: 3,
			q: 2,
			z: 0,
			h: 1,
			v: 1,
		};

		// Each command: Command character followed by anything that isn't a command character
		const commandExp = /([MZLHVCSQTA])\s*([^MZLHVCSQTA]*)/gi;
		let current;
		while ((current = commandExp.exec(pathString)) !== null) {
			const argParts = current[2]
				.trim()
				.split(/[^0-9Ee.-]/)
				.filter((part) => part.length > 0)
				.reduce((accumualtor: string[], current: string): string[] => {
					// As of 09/2022, iOS Safari doesn't support support lookbehind in regular
					// expressions. As such, we need an alternative.
					// Because '-' can be used as a path separator, unless preceeded by an 'e' (as in 1e-5),
					// we need special cases:
					current = current.replace(/([^eE])[-]/g, '$1 -');
					const parts = current.split(' -');
					if (parts[0] !== '') {
						accumualtor.push(parts[0]);
					}
					accumualtor.push(...parts.slice(1).map((part) => `-${part}`));
					return accumualtor;
				}, []);

			let numericArgs = argParts.map((arg) => parseFloat(arg));

			let commandChar = current[1].toLowerCase();
			let uppercaseCommand = current[1] !== commandChar;

			// Convert commands that don't take points into commands that do.
			if (commandChar === 'v' || commandChar === 'h') {
				numericArgs = numericArgs.reduce((accumulator: number[], current: number): number[] => {
					if (commandChar === 'v') {
						return accumulator.concat(uppercaseCommand ? lastPos.x : 0, current);
					} else {
						return accumulator.concat(current, uppercaseCommand ? lastPos.y : 0);
					}
				}, []);
				commandChar = 'l';
			} else if (commandChar === 'z') {
				if (firstPos) {
					numericArgs = [firstPos.x, firstPos.y];
					firstPos = lastPos;
				} else {
					continue;
				}

				// 'z' always acts like an uppercase lineTo(startPos)
				uppercaseCommand = true;
				commandChar = 'l';
			}

			const commandArgCount: number = commandArgCounts[commandChar] ?? 0;
			const allArgs = numericArgs
				.reduce((accumulator: Point2[], current, index, parts): Point2[] => {
					if (index % 2 !== 0) {
						const currentAsFloat = current;
						const prevAsFloat = parts[index - 1];
						return accumulator.concat(Vec2.of(prevAsFloat, currentAsFloat));
					} else {
						return accumulator;
					}
				}, [])
				.map((coordinate, index): Point2 => {
					// Lowercase commands are relative, uppercase commands use absolute
					// positioning
					let newPos;
					if (uppercaseCommand) {
						newPos = coordinate;
					} else {
						newPos = lastPos.plus(coordinate);
					}

					if ((index + 1) % commandArgCount === 0) {
						lastPos = newPos;
					}

					return newPos;
				});

			if (allArgs.length % commandArgCount !== 0) {
				throw new Error(
					[
						`Incorrect number of arguments: got ${JSON.stringify(allArgs)} with a length of ${allArgs.length} ≠ ${commandArgCount}k, k ∈ ℤ.`,
						`The number of arguments to ${commandChar} must be a multiple of ${commandArgCount}!`,
						`Command: ${current[0]}`,
					].join('\n'),
				);
			}

			for (let argPos = 0; argPos < allArgs.length; argPos += commandArgCount) {
				const args = allArgs.slice(argPos, argPos + commandArgCount);

				switch (commandChar.toLowerCase()) {
					case 'm':
						if (argPos === 0) {
							moveTo(args[0]);
						} else {
							lineTo(args[0]);
						}
						break;
					case 'l':
						lineTo(args[0]);
						break;
					case 'c':
						cubicBezierTo(args[0], args[1], args[2]);
						break;
					case 'q':
						quadraticBeierTo(args[0], args[1]);
						break;
					default:
						throw new Error(`Unknown path command ${commandChar}`);
				}

				isFirstCommand = false;
			}

			if (allArgs.length > 0) {
				firstPos ??= allArgs[0];
				startPos ??= firstPos;
				lastPos = allArgs[allArgs.length - 1];
			}
		}

		const result = new Path(startPos ?? Vec2.zero, commands);
		result.cachedStringVersion = pathString;
		return result;
	}

	public static fromConvexHullOf(points: Point2[]) {
		if (points.length === 0) {
			return Path.empty;
		}

		const hull = convexHull2Of(points);

		const commands = hull.slice(1).map(
			(p): LinePathCommand => ({
				kind: PathCommandType.LineTo,
				point: p,
			}),
		);
		// Close -- connect back to the start
		commands.push({
			kind: PathCommandType.LineTo,
			point: hull[0],
		});

		return new Path(hull[0], commands);
	}

	// @internal TODO: At present, this isn't really an empty path.
	public static empty: Path = new Path(Vec2.zero, []);
}
export default Path;
