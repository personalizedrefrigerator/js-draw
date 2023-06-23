import { RenderablePathSpec } from '../../rendering/renderers/AbstractRenderer';
import RenderingStyle from '../../rendering/RenderingStyle';
import { toRoundedString, toStringOfSamePrecision } from '../rounding';
import LineSegment2 from './LineSegment2';
import Mat33 from '../Mat33';
import Rect2 from './Rect2';
import { Point2, Vec2 } from '../Vec2';
import Abstract2DShape from './Abstract2DShape';
import CubicBezier from './CubicBezier';
import QuadraticBezier from './QuadraticBezier';
import PointShape2D from './PointShape2D';
import EllipticalArc from './EllipticalArc';

export enum PathCommandType {
	LineTo,
	MoveTo,
	CubicBezierTo,
	QuadraticBezierTo,
	EllipticalArcTo,
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

// See [the W3C spec](https://www.w3.org/TR/SVG/implnote.html#ArcSyntax) for details.
export interface EllipticalArcPathCommand {
	kind: PathCommandType.EllipticalArcTo,
	endPoint: Point2,
	size: Vec2, // Vec2(semimajor axis, semiminor axis)
	majorAxisRotation: number,
	largeArcFlag: boolean,
	sweepFlag: boolean
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
	CubicBezierPathCommand
	| QuadraticBezierPathCommand
	| EllipticalArcPathCommand
	| MoveToPathCommand
	| LinePathCommand;

interface IntersectionResult {
	// @internal
	curve: Abstract2DShape;

	/** @internal @deprecated */
	parameterValue?: number;

	// Point at which the intersection occured.
	point: Point2;
}

const arcFromCommand = (startPoint: Point2, part: EllipticalArcPathCommand) => {
	return EllipticalArc.fromStartEnd(
		startPoint, part.endPoint, part.size.x, part.size.y,
		part.majorAxisRotation, part.largeArcFlag, part.sweepFlag
	);
};

type GeometryType = Abstract2DShape;
type GeometryArrayType = Array<GeometryType>;

export default class Path {
	/**
	 * A rough estimate of the bounding box of the path.
	 * A slight overestimate.
	 * See {@link getExactBBox}
	 */
	public readonly bbox: Rect2;

	public constructor(public readonly startPoint: Point2, public readonly parts: PathCommand[]) {
		// Initial bounding box contains one point: the start point.
		this.bbox = Rect2.bboxOf([startPoint]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		let lastPoint = startPoint;
		for (const part of parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(lastPoint, part));
			lastPoint = Path.getPartEndpoint(part);
		}
	}

	public getExactBBox(): Rect2 {
		const bboxes: Rect2[] = [];
		for (const part of this.geometry) {
			bboxes.push(part.getTightBoundingBox());
		}

		return Rect2.union(...bboxes);
	}

	private cachedGeometry: GeometryArrayType|null = null;

	// Lazy-loads and returns this path's geometry
	public get geometry(): GeometryArrayType {
		if (this.cachedGeometry) {
			return this.cachedGeometry;
		}

		let startPoint = this.startPoint;
		const geometry: GeometryArrayType = [];
		let exhaustivenessCheck: never;

		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.CubicBezierTo:
				geometry.push(
					new CubicBezier(
						startPoint, part.controlPoint1, part.controlPoint2, part.endPoint
					)
				);
				startPoint = part.endPoint;
				break;
			case PathCommandType.QuadraticBezierTo:
				geometry.push(
					new QuadraticBezier(
						startPoint, part.controlPoint, part.endPoint
					)
				);
				startPoint = part.endPoint;
				break;
			case PathCommandType.LineTo:
				geometry.push(
					new LineSegment2(startPoint, part.point)
				);
				startPoint = part.point;
				break;
			case PathCommandType.MoveTo:
				geometry.push(new PointShape2D(part.point));
				startPoint = part.point;
				break;
			case PathCommandType.EllipticalArcTo:
				geometry.push(arcFromCommand(startPoint, part));
				startPoint = part.endPoint;
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
			}
		}

		this.cachedGeometry = geometry;
		return this.cachedGeometry;
	}

	private cachedPolylineApproximation: LineSegment2[]|null = null;

	// Approximates this path with a group of line segments.
	public polylineApproximation(): LineSegment2[] {
		if (this.cachedPolylineApproximation) {
			return this.cachedPolylineApproximation;
		}

		const points: Point2[] = [];
		let exhaustivenessCheck: never;

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
			case PathCommandType.EllipticalArcTo:
				points.push(part.endPoint);
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
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

	/**
	 * **Estimates** the bounding box for the path segment given by `part`. This
	 * estimate is an overestimate.
	 */
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
		case PathCommandType.EllipticalArcTo:
			points.push(...arcFromCommand(startPoint, part).getLooseBoundingBox().corners);
			break;
		default:
			exhaustivenessCheck = part;
			return exhaustivenessCheck;
		}

		return Rect2.bboxOf(points);
	}

	public static getPartEndpoint(part: PathCommand) {
		if (part.kind === PathCommandType.LineTo || part.kind === PathCommandType.MoveTo) {
			return part.point;
		} else {
			return part.endPoint;
		}
	}

	/**
	 * Let `S` be a closed path a distance `strokeRadius` from this path.
	 *
	 * @returns Approximate intersections of `line` with `S` using ray marching, starting from
	 * 	        both end points of `line` and each point in `additionalRaymarchStartPoints`.
	 */
	private raymarchIntersectionWith(
		line: LineSegment2, strokeRadius: number, additionalRaymarchStartPoints: Point2[] = []
	): IntersectionResult[] {
		// No intersection between bounding boxes: No possible intersection
		// of the interior.
		if (!line.bbox.intersects(this.bbox.grownBy(strokeRadius))) {
			return [];
		}

		const lineLength = line.length;

		type DistanceFunction = (point: Point2) => number;
		const partDistFunctionRecords: {
			part: GeometryType,
			bbox: Rect2,
			distFn: DistanceFunction,
		}[] = [];

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
		const sdf = (point: Point2): [GeometryType|null, number] => {
			let minDist = Infinity;
			let minDistPart = null;

			const uncheckedDistFunctions = [];

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
				if (!bbox.grownBy(minDist).containsPoint(point)) {
					continue;
				}

				const currentDist = distFn(point);

				if (currentDist <= minDist) {
					minDist = currentDist;
					minDistPart = part;
				}
			}

			return [ minDistPart, minDist - strokeRadius ];
		};


		// Raymarch:
		const maxRaymarchSteps = 7;

		// Start raymarching from each of these points. This allows detection of multiple
		// intersections.
		const startPoints = [
			line.p1, ...additionalRaymarchStartPoints, line.p2
		];

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

		// Returns the maximum x value explored
		const raymarchFrom = (
			startPoint: Point2,

			// Direction to march in (multiplies line.direction)
			directionMultiplier: -1|1,

			// Terminate if the current point corresponds to a parameter
			// below this.
			minimumLineParameter: number,
		): number|null => {
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
					parameterValue: NaN,
					curve: lastPart,
				});
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
	 */
	public intersection(line: LineSegment2, strokeRadius?: number): IntersectionResult[] {
		let result: IntersectionResult[] = [];

		// Is any intersection between shapes within the bounding boxes impossible?
		if (!line.bbox.intersects(this.bbox.grownBy(strokeRadius ?? 0))) {
			return [];
		}

		for (const part of this.geometry) {
			const intersection = part.intersectsLineSegment(line);

			if (intersection.length > 0) {
				result.push({
					curve: part,
					point: intersection[0],
				});
			}
		}

		// If given a non-zero strokeWidth, attempt to raymarch.
		// Even if raymarching, we need to collect starting points.
		// We use the above-calculated intersections for this.
		const doRaymarching = strokeRadius && strokeRadius > 1e-8;
		if (doRaymarching) {
			// Starting points for raymarching (in addition to the end points of the line).
			const startPoints = result.map(intersection => intersection.point);
			result = this.raymarchIntersectionWith(line, strokeRadius, startPoints);
		}

		return result;
	}

	private static mapPathCommand(
		startPoint: Point2, part: PathCommand, mapping: (point: Point2)=> Point2
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

		if (part.kind === PathCommandType.EllipticalArcTo) {
			// TODO: Can this be done without (re)initializing this portion of the geometry?
			// TODO: Move to EllipticalArc.ts
			const arc = arcFromCommand(startPoint, part);
			if (arc instanceof LineSegment2) {
				return {
					kind: PathCommandType.LineTo,
					point: mapping(part.endPoint),
				};
			}

			// TODO: This isn't correct in all cases.
			const ellipse = arc.fullEllipse;
			const majAxisDirection = Vec2.of(
				Math.cos(part.majorAxisRotation),
				Math.sin(part.majorAxisRotation)
			);
			const minAxisDirection = Vec2.of(
				Math.cos(part.majorAxisRotation + Math.PI / 2),
				Math.sin(part.majorAxisRotation + Math.PI / 2)
			);
			const p1 = ellipse.center.plus(majAxisDirection.times(part.size.x));
			const p2 = ellipse.center.plus(minAxisDirection.times(part.size.y));

			const p1Mapped = mapping(p1);
			const p2Mapped = mapping(p2);

			const centerMapped = mapping(arc.fullEllipse.center);

			const semiMajorAxisMapped = p1Mapped.minus(centerMapped);
			const semiMinorAxisMapped = p2Mapped.minus(centerMapped);

			return {
				kind: part.kind,
				endPoint: mapping(part.endPoint),
				size: Vec2.of(semiMajorAxisMapped.length(), semiMinorAxisMapped.length()),
				majorAxisRotation: semiMajorAxisMapped.angle(),

				// TODO: Do these need to be changed based on the mapping?
				largeArcFlag: part.largeArcFlag,
				sweepFlag: part.sweepFlag,
			};
		}

		const exhaustivenessCheck: never = part;
		return exhaustivenessCheck;
	}

	public mapPoints(mapping: (point: Point2)=>Point2): Path {
		const startPoint = mapping(this.startPoint);
		const newParts: PathCommand[] = [];
		let prevPoint = this.startPoint;

		for (const part of this.parts) {
			newParts.push(Path.mapPathCommand(prevPoint, part, mapping));
			prevPoint = Path.getPartEndpoint(part);
		}

		return new Path(startPoint, newParts);
	}

	public transformedBy(affineTransfm: Mat33): Path {
		if (affineTransfm.isIdentity()) {
			return this;
		}

		return this.mapPoints(point => affineTransfm.transformVec2(point));
	}

	// Creates a new path by joining [other] to the end of this path
	public union(other: Path|null): Path {
		if (!other) {
			return this;
		}

		return new Path(this.startPoint, [
			...this.parts,
			{
				kind: PathCommandType.MoveTo,
				point: other.startPoint,
			},
			...other.parts,
		]);
	}

	private getEndPoint() {
		if (this.parts.length === 0) {
			return this.startPoint;
		}
		const lastPart = this.parts[this.parts.length - 1];
		return Path.getPartEndpoint(lastPart);
	}

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
			startPoint = Path.getPartEndpoint(part);

			if (rect.intersects(bbox)) {
				return true;
			}
		}

		return false;
	}

	// Treats this as a closed path and returns true if part of `rect` is roughly within
	// this path's interior.
	//
	// Note: Assumes that this is a closed, non-self-intersecting path.
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
					intersectionCount ++;
				}
			}

			// Odd? The point is within the polygon!
			if (intersectionCount % 2 === 1) {
				return true;
			}
		}

		// Grow the rectangle for possible additional precision.
		const grownRect = rect.grownBy(Math.min(rect.size.x, rect.size.y));
		const edges = [];
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

	// Returns a path that outlines [rect]. If [lineWidth] is not given, the resultant path is
	// the outline of [rect]. Otherwise, the resultant path represents a line of width [lineWidth]
	// that traces [rect].
	public static fromRect(rect: Rect2, lineWidth: number|null = null): Path {
		const commands: PathCommand[] = [];

		let corners;
		let startPoint;

		if (lineWidth !== null) {
			// Vector from the top left corner or bottom right corner to the edge of the
			// stroked region.
			const cornerToEdge = Vec2.of(lineWidth, lineWidth).times(0.5);
			const innerRect = Rect2.fromCorners(
				rect.topLeft.plus(cornerToEdge),
				rect.bottomRight.minus(cornerToEdge)
			);
			const outerRect = Rect2.fromCorners(
				rect.topLeft.minus(cornerToEdge),
				rect.bottomRight.plus(cornerToEdge)
			);

			corners = [
				innerRect.corners[3],
				...innerRect.corners,
				...outerRect.corners.reverse(),
			];
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

	public static fromRenderable(renderable: RenderablePathSpec): Path {
		if (renderable.path) {
			return renderable.path;
		}

		return new Path(renderable.startPoint, renderable.commands);
	}

	public toRenderable(fill: RenderingStyle): RenderablePathSpec {
		return {
			startPoint: this.startPoint,
			style: fill,
			commands: this.parts,
			path: this,
		};
	}

	/**
	 * @returns a Path that, when rendered, looks roughly equivalent to the given path.
	 */
	public static visualEquivalent(renderablePath: RenderablePathSpec, visibleRect: Rect2): RenderablePathSpec {
		const path = Path.fromRenderable(renderablePath);
		const strokeWidth = renderablePath.style.stroke?.width ?? 0;
		const onlyStroked = strokeWidth > 0 && renderablePath.style.fill.a === 0;

		// Scale the expanded rect --- the visual equivalent is only close for huge strokes.
		const expandedRect = visibleRect.grownBy(strokeWidth)
			.transformedBoundingBox(Mat33.scaling2D(4, visibleRect.center));

		// TODO: Handle simplifying very small paths.
		if (expandedRect.containsRect(path.bbox.grownBy(strokeWidth))) {
			return renderablePath;
		}
		const parts: PathCommand[] = [];
		let startPoint = path.startPoint;

		for (const part of path.parts) {
			const partBBox = Path.computeBBoxForSegment(startPoint, part).grownBy(strokeWidth);
			let endPoint;

			if (part.kind === PathCommandType.LineTo || part.kind === PathCommandType.MoveTo) {
				endPoint = part.point;
			} else {
				endPoint = part.endPoint;
			}

			const intersectsVisible = partBBox.intersects(visibleRect);

			if (intersectsVisible) {
				// TODO: Can we trim parts of paths that intersect the visible rectangle?
				parts.push(part);
			} else if (onlyStroked || part.kind === PathCommandType.MoveTo) {
				// We're stroking (not filling) and the path doesn't intersect the bounding box.
				// Don't draw it, but preserve the endpoints.
				parts.push({
					kind: PathCommandType.MoveTo,
					point: endPoint,
				});
			}
			else {
				// Otherwise, we may be filling. Try to roughly preserve the filled region.
				parts.push({
					kind: PathCommandType.LineTo,
					point: endPoint,
				});
			}

			startPoint = endPoint;
		}

		return new Path(path.startPoint, parts).toRenderable(renderablePath.style);
	}

	private cachedStringVersion: string|null = null;

	public toString(useNonAbsCommands?: boolean): string {
		if (this.cachedStringVersion) {
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
	public static toString(startPoint: Point2, parts: PathCommand[], onlyAbsCommands?: boolean): string {
		const result: string[] = [];

		let prevPoint: Point2|undefined;
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
					const xComponentRelative = toStringOfSamePrecision(point.x - prevPoint!.x, xComponent, roundedPrevX, roundedPrevY);
					const yComponentRelative = toStringOfSamePrecision(point.y - prevPoint!.y, yComponent, roundedPrevX, roundedPrevY);

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

		const addArcCommand = (command: EllipticalArcPathCommand) => {
			const endX = toRoundedString(command.endPoint.x);
			const endY = toRoundedString(command.endPoint.y);
			const rx = toRoundedString(command.size.x);
			const ry = toRoundedString(command.size.y);
			const xRotation = toRoundedString(command.majorAxisRotation * 180 / Math.PI);
			const largeArcFlag = command.largeArcFlag ? '1' : '0';
			const sweepFlag = command.sweepFlag ? '1' : '0';

			result.push(`A${rx},${ry} ${xRotation} ${largeArcFlag} ${sweepFlag} ${endX},${endY}`);
			prevPoint = command.endPoint;
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
			case PathCommandType.EllipticalArcTo:
				addArcCommand(part);
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
			}
		}

		return result.join('');
	}

	// Create a Path from a SVG path specification.
	// TODO: Support a larger subset of SVG paths.
	// TODO: Support `s`,`t` commands shorthands.
	public static fromString(pathString: string): Path {
		// See the MDN reference:
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
		// and
		// https://www.w3.org/TR/SVG2/paths.html

		// Remove linebreaks
		pathString = pathString.split('\n').join(' ');

		let lastPos: Point2 = Vec2.zero;
		let firstPos: Point2|null = null;
		let startPos: Point2|null = null;
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
		const ellipticalArcTo = (
			rx: number, ry: number,

			// Degrees
			majAxisRotation: number,
			largeArcFlag: number, sweepFlag: number,
			endPoint: Point2,
		) => {
			// Degrees -> radians
			majAxisRotation = majAxisRotation * Math.PI / 180;

			commands.push({
				kind: PathCommandType.EllipticalArcTo,
				size: Vec2.of(rx, ry),
				majorAxisRotation: majAxisRotation,
				largeArcFlag: largeArcFlag > 0.5,
				sweepFlag: sweepFlag > 0.5,
				endPoint,
			});
		};
		const commandArgCounts: Record<string, number> = {
			'm': 2,
			'l': 2,
			'c': 6,
			'a': 7,
			'q': 4,
			'z': 0,
			'h': 2,
			'v': 2,
		};

		// Each command: Command character followed by anything that isn't a command character
		const commandExp = /([MZLHVCSQTA])\s*([^MZLHVCSQTA]*)/ig;
		let current;
		while ((current = commandExp.exec(pathString)) !== null) {
			const argParts = current[2].trim().split(/[^0-9Ee.-]/).filter(
				part => part.length > 0
			).reduce((accumualtor: string[], current: string): string[] => {
				// As of 09/2022, iOS Safari doesn't support support lookbehind in regular
				// expressions. As such, we need an alternative.
				// Because '-' can be used as a path separator, unless preceeded by an 'e' (as in 1e-5),
				// we need special cases:
				current = current.replace(/([^eE])[-]/g, '$1 -');
				const parts = current.split(' -');
				if (parts[0] !== '') {
					accumualtor.push(parts[0]);
				}
				accumualtor.push(...parts.slice(1).map(part => `-${part}`));
				return accumualtor;
			}, []);

			// All arguments, converted to numbers
			const numericArgs = argParts.map(arg => parseFloat(arg));

			let pointArgCoordinates = numericArgs;
			const nonPointArgs: number[] = [];

			let commandChar = current[1].toLowerCase();
			let uppercaseCommand = current[1] !== commandChar;

			let nonPointArgsPerSet = 0;

			// Convert commands that don't take points into commands that do.
			if (commandChar === 'v' || commandChar === 'h') {
				pointArgCoordinates = pointArgCoordinates.reduce((accumulator: number[], current: number): number[] => {
					if (commandChar === 'v') {
						return accumulator.concat(uppercaseCommand ? lastPos.x : 0, current);
					} else {
						return accumulator.concat(current, uppercaseCommand ? lastPos.y : 0);
					}
				}, []);
				commandChar = 'l';
			} else if (commandChar === 'z') {
				if (firstPos) {
					pointArgCoordinates = [ firstPos.x, firstPos.y ];
					firstPos = lastPos;
				} else {
					continue;
				}

				// 'z' always acts like an uppercase lineTo(startPos)
				uppercaseCommand = true;
				commandChar = 'l';
			}

			// Expected number of arguments per set.
			const expectedArgCount: number = commandArgCounts[commandChar] ?? 0;

			// Some commands don't take only point arguments and thus need
			// special  processing.
			if (commandChar === 'a') {
				pointArgCoordinates = [];
				nonPointArgsPerSet = 5;
				for (let i = 0; i < numericArgs.length; i++) {
					//  0  1  2               3           4         5 6
					// rx ry majAxisRotation largeArcFlag sweepFlag x y
					if (i % expectedArgCount === 5 || i % expectedArgCount === 6) {
						pointArgCoordinates.push(numericArgs[i]);
					} else {
						nonPointArgs.push(numericArgs[i]);
					}
				}
			}

			const actualArgCount = pointArgCoordinates.length + nonPointArgs.length;
			if (actualArgCount % expectedArgCount !== 0) {
				throw new Error([
					`Incorrect number of arguments: got ${JSON.stringify(numericArgs)}`,
					`with a length of ${actualArgCount} ≠ ${expectedArgCount}k, k ∈ ℤ.`,
					`The number of arguments to ${commandChar} must be a multiple of ${expectedArgCount}!`,
					`Command: ${current[0]}`,
				].join('\n'));
			}

			// Because SVG argument lists can be repeated without repeating letters,
			// we can have multiple sets of arguments for the same command;
			const numArgSets = actualArgCount / expectedArgCount;
			const pointArgsPerSet = (expectedArgCount - nonPointArgsPerSet) / 2;

			const pointArgs = pointArgCoordinates.reduce((
				accumulator: Point2[], current, index, parts
			): Point2[] => {
				if (index % 2 !== 0) {
					const currentAsFloat = current;
					const prevAsFloat = parts[index - 1];
					return accumulator.concat(Vec2.of(prevAsFloat, currentAsFloat));
				} else {
					return accumulator;
				}
			}, []).map((coordinate, index): Point2 => {
				// Lowercase commands are relative, uppercase commands use absolute
				// positioning
				let newPos;
				if (uppercaseCommand) {
					newPos = coordinate;
				} else {
					newPos = lastPos.plus(coordinate);
				}

				// If the last point arg in the set,
				if ((index + 1) % pointArgsPerSet === 0) {
					lastPos = newPos;
				}

				return newPos;
			});


			for (let argSetIdx = 0; argSetIdx < numArgSets; argSetIdx ++) {
				const points = pointArgs.slice(
					argSetIdx * pointArgsPerSet,
					(argSetIdx + 1) * pointArgsPerSet
				);
				const nonPoints = nonPointArgsPerSet === 0 ? [] : nonPointArgs.slice(
					argSetIdx * nonPointArgsPerSet,
					(argSetIdx + 1) * nonPointArgsPerSet
				);

				switch (commandChar.toLowerCase()) {
				case 'm':
					if (argSetIdx === 0) {
						moveTo(points[0]);
					} else {
						lineTo(points[0]);
					}
					break;
				case 'l':
					lineTo(points[0]);
					break;
				case 'c':
					cubicBezierTo(points[0], points[1], points[2]);
					break;
				case 'q':
					quadraticBeierTo(points[0], points[1]);
					break;
				case 'a':
					ellipticalArcTo(
						nonPoints[0], nonPoints[1],
						nonPoints[2], nonPoints[3], nonPoints[4],
						points[0],
					);
					break;
				default:
					throw new Error(`Unknown path command ${commandChar}`);
				}

				isFirstCommand = false;
			}

			if (pointArgs.length > 0) {
				firstPos ??= pointArgs[0];
				startPos ??= firstPos;
				lastPos = pointArgs[pointArgs.length - 1];
			}
		}

		const result = new Path(startPos ?? Vec2.zero, commands);
		result.cachedStringVersion = pathString;
		return result;
	}

	public static empty: Path = new Path(Vec2.zero, []);
}
