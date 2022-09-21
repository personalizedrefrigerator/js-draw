import { Bezier } from 'bezier-js';
import { RenderablePathSpec } from '../rendering/renderers/AbstractRenderer';
import RenderingStyle from '../rendering/RenderingStyle';
import { toRoundedString, toStringOfSamePrecision } from './rounding';
import LineSegment2 from './LineSegment2';
import Mat33 from './Mat33';
import Rect2 from './Rect2';
import { Point2, Vec2 } from './Vec2';

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

export type PathCommand = CubicBezierPathCommand | LinePathCommand | QuadraticBezierPathCommand | MoveToPathCommand;

interface IntersectionResult {
	curve: LineSegment2|Bezier;
	parameterValue: number;
	point: Point2;
}

type GeometryArrayType = Array<LineSegment2|Bezier>;
export default class Path {
	public readonly bbox: Rect2;

	public constructor(public readonly startPoint: Point2, public readonly parts: PathCommand[]) {
		// Initial bounding box contains one point: the start point.
		this.bbox = Rect2.bboxOf([startPoint]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(startPoint, part));
		}
	}

	private cachedGeometry: GeometryArrayType|null = null;

	// Lazy-loads and returns this path's geometry
	public get geometry(): Array<LineSegment2|Bezier> {
		if (this.cachedGeometry) {
			return this.cachedGeometry;
		}

		let startPoint = this.startPoint;
		const geometry: GeometryArrayType = [];

		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.CubicBezierTo:
				geometry.push(
					new Bezier(
						startPoint.xy, part.controlPoint1.xy, part.controlPoint2.xy, part.endPoint.xy
					)
				);
				startPoint = part.endPoint;
				break;
			case PathCommandType.QuadraticBezierTo:
				geometry.push(
					new Bezier(
						startPoint.xy, part.controlPoint.xy, part.endPoint.xy
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
				startPoint = part.point;
				break;
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

	public intersection(line: LineSegment2): IntersectionResult[] {
		const result: IntersectionResult[] = [];
		for (const part of this.geometry) {
			if (part instanceof LineSegment2) {
				const intersection = part.intersection(line);

				if (intersection) {
					result.push({
						curve: part,
						parameterValue: intersection.t,
						point: intersection.point,
					});
				}
			} else {
				const intersectionPoints = part.intersects(line).map(t => {
					// We're using the .intersects(line) function, which is documented
					// to always return numbers. However, to satisfy the type checker (and
					// possibly improperly-defined types),
					if (typeof t === 'string') {
						t = parseFloat(t);
					}

					const point = Vec2.ofXY(part.get(t));

					// Ensure that the intersection is on the line
					if (point.minus(line.p1).magnitude() > line.length
							|| point.minus(line.p2).magnitude() > line.length) {
						return null;
					}

					return {
						point,
						parameterValue: t,
						curve: part,
					};
				}).filter(entry => entry !== null) as IntersectionResult[];
				result.push(...intersectionPoints);
			}
		}

		return result;
	}

	public mapPoints(mapping: (point: Point2)=>Point2): Path {
		const startPoint = mapping(this.startPoint);
		const newParts: PathCommand[] = [];

		let exhaustivenessCheck: never;
		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.MoveTo:
			case PathCommandType.LineTo:
				newParts.push({
					kind: part.kind,
					point: mapping(part.point),
				});
				break;
			case PathCommandType.CubicBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint1: mapping(part.controlPoint1),
					controlPoint2: mapping(part.controlPoint2),
					endPoint: mapping(part.endPoint),
				});
				break;
			case PathCommandType.QuadraticBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint: mapping(part.controlPoint),
					endPoint: mapping(part.endPoint),
				});
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
			}
		}

		return new Path(startPoint, newParts);
	}

	public transformedBy(affineTransfm: Mat33): Path {
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

	// Treats this as a closed path and returns true if part of `rect` is roughly within
	// this path's interior.
	//
	// Note: Assumes that this is a closed, non-self-intersecting path.
	public closedIntersects(rect: Rect2): boolean {
		if (rect.containsRect(this.bbox)) {
			return true;
		}

		// Choose a point outside of the path.
		const startPt = this.bbox.topLeft.minus(Vec2.of(1, 1));
		const testPts = rect.corners;

		for (const point of testPts) {
			const testLine = new LineSegment2(point, startPt);
			const intersectionCount = this.intersection(testLine).length;

			// Odd? The point is within the polygon!
			if (intersectionCount % 2 === 1) {
				return true;
			}
		}

		for (const edge of rect.getEdges()) {
			const intersectionCount = this.intersection(edge).length;
			if (intersectionCount > 0) {
				return true;
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

	private cachedStringVersion: string|null = null;

	public toString(): string {
		if (this.cachedStringVersion) {
			return this.cachedStringVersion;
		}

		// Hueristic: Try to determine whether converting absolute to relative commands is worth it.
		//            If we're near (0, 0), it probably isn't worth it and if bounding boxes are large,
		//            it also probably isn't worth it.
		const makeRelativeCommands =
			Math.abs(this.bbox.topLeft.x) > 10 && Math.abs(this.bbox.size.x) < 2
			&& Math.abs(this.bbox.topLeft.y) > 10 && Math.abs(this.bbox.size.y) < 2;

		const result = Path.toString(this.startPoint, this.parts, !makeRelativeCommands);
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
				// Relative commands are often shorter as strings than absolute commands.
				if (!makeAbsCommand) {
					const xComponentRelative = toStringOfSamePrecision(point.x - prevPoint!.x, roundedPrevX, roundedPrevY);
					const yComponentRelative = toStringOfSamePrecision(point.y - prevPoint!.y, roundedPrevX, roundedPrevY);

					// No need for an additional separator if it starts with a '-'
					if (yComponentRelative.charAt(0) === '-') {
						relativeCommandParts.push(`${xComponentRelative}${yComponentRelative}`);
					} else {
						relativeCommandParts.push(`${xComponentRelative},${yComponentRelative}`);
					}
				} else {
					const xComponent = toRoundedString(point.x);
					const yComponent = toRoundedString(point.y);

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
			if (commandString === 'l0,0') {
				return;
			}
			result.push(commandString);

			if (points.length > 0) {
				prevPoint = points[points.length - 1];
			}
		};

		addCommand('M', startPoint);
		let exhaustivenessCheck: never;
		for (const part of parts) {
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
		const commandArgCounts: Record<string, number> = {
			'm': 1,
			'l': 1,
			'c': 3,
			'q': 2,
			'z': 0,
			'h': 1,
			'v': 1,
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

			let numericArgs = argParts.map(arg => parseFloat(arg));

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
					numericArgs = [ firstPos.x, firstPos.y ];
					firstPos = lastPos;
				} else {
					continue;
				}

				// 'z' always acts like an uppercase lineTo(startPos)
				uppercaseCommand = true;
				commandChar = 'l';
			}


			const commandArgCount: number = commandArgCounts[commandChar] ?? 0;
			const allArgs = numericArgs.reduce((
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

				if ((index + 1) % commandArgCount === 0) {
					lastPos = newPos;
				}

				return newPos;
			});
	
			if (allArgs.length % commandArgCount !== 0) {
				throw new Error([
					`Incorrect number of arguments: got ${JSON.stringify(allArgs)} with a length of ${allArgs.length} ≠ ${commandArgCount}k, k ∈ ℤ.`,
					`The number of arguments to ${commandChar} must be a multiple of ${commandArgCount}!`,
					`Command: ${current[0]}`,
				].join('\n'));
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

	public static empty: Path = new Path(Vec2.zero, []);
}
