import { Bezier } from 'bezier-js';
import { RenderablePathSpec } from '../rendering/renderers/AbstractRenderer';
import RenderingStyle from '../rendering/RenderingStyle';
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
	private cachedGeometry: GeometryArrayType|null;
	public readonly bbox: Rect2;

	public constructor(public readonly startPoint: Point2, public readonly parts: PathCommand[]) {
		this.cachedGeometry = null;

		// Initial bounding box contains one point: the start point.
		this.bbox = Rect2.bboxOf([startPoint]);

		// Convert into a representation of the geometry (cache for faster intersection
		// calculation)
		for (const part of parts) {
			this.bbox = this.bbox.union(Path.computeBBoxForSegment(startPoint, part));
		}
	}

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

	public transformedBy(affineTransfm: Mat33): Path {
		const startPoint = affineTransfm.transformVec2(this.startPoint);
		const newParts: PathCommand[] = [];

		let exhaustivenessCheck: never;
		for (const part of this.parts) {
			switch (part.kind) {
			case PathCommandType.MoveTo:
			case PathCommandType.LineTo:
				newParts.push({
					kind: part.kind,
					point: affineTransfm.transformVec2(part.point),
				});
				break;
			case PathCommandType.CubicBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint1: affineTransfm.transformVec2(part.controlPoint1),
					controlPoint2: affineTransfm.transformVec2(part.controlPoint2),
					endPoint: affineTransfm.transformVec2(part.endPoint),
				});
				break;
			case PathCommandType.QuadraticBezierTo:
				newParts.push({
					kind: part.kind,
					controlPoint: affineTransfm.transformVec2(part.controlPoint),
					endPoint: affineTransfm.transformVec2(part.endPoint),
				});
				break;
			default:
				exhaustivenessCheck = part;
				return exhaustivenessCheck;
			}
		}

		return new Path(startPoint, newParts);
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
		return new Path(renderable.startPoint, renderable.commands);
	}

	public toRenderable(fill: RenderingStyle): RenderablePathSpec {
		return {
			startPoint: this.startPoint,
			style: fill,
			commands: this.parts,
		};
	}

	public toString(): string {
		return Path.toString(this.startPoint, this.parts);
	}

	public serialize(): string {
		return this.toString();
	}

	public static toString(startPoint: Point2, parts: PathCommand[]): string {
		const result: string[] = [];

		const toRoundedString = (num: number): string => {
			// Try to remove rounding errors. If the number ends in at least three/four zeroes
			// (or nines) just one or two digits, it's probably a rounding error.
			const fixRoundingUpExp = /^([-]?\d*\.\d{3,})0{4,}\d$/;
			const hasRoundingDownExp = /^([-]?)(\d*)\.(\d{3,}9{4,}\d)$/;

			let text = num.toString();
			if (text.indexOf('.') === -1) {
				return text;
			}

			const roundingDownMatch = hasRoundingDownExp.exec(text);
			if (roundingDownMatch) {
				const negativeSign = roundingDownMatch[1];
				const lastDigit = parseInt(text.charAt(text.length - 1), 10);
				const postDecimal = parseInt(roundingDownMatch[3], 10);
				const preDecimal = parseInt(roundingDownMatch[2], 10);

				const origPostDecimalString = roundingDownMatch[3];

				let newPostDecimal = (postDecimal + 10 - lastDigit).toString();
				let carry = 0;
				if (newPostDecimal.length > postDecimal.toString().length) {
					// Left-shift
					newPostDecimal = newPostDecimal.substring(1);
					carry = 1;
				}

				// parseInt(...).toString() removes leading zeroes. Add them back.
				while (newPostDecimal.length < origPostDecimalString.length) {
					newPostDecimal = carry.toString(10) + newPostDecimal;
					carry = 0;
				}

				text = `${negativeSign + (preDecimal + carry).toString()}.${newPostDecimal}`;
			}

			text = text.replace(fixRoundingUpExp, '$1');

			// Remove trailing zeroes
			text = text.replace(/([.]\d*[^0]+)0+$/, '$1');
			text = text.replace(/[.]0+$/, '.');

			// Remove trailing period
			return text.replace(/[.]$/, '');
		};

		const addCommand = (command: string, ...points: Point2[]) => {
			const parts: string[] = [];
			for (const point of points) {
				const xComponent = toRoundedString(point.x);
				const yComponent = toRoundedString(point.y);
				parts.push(`${xComponent},${yComponent}`);
			}
			result.push(`${command}${parts.join(' ')}`);
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
	// TODO: Support s,t shorthands.
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

		return new Path(startPos ?? Vec2.zero, commands);
	}

	public static empty: Path = new Path(Vec2.zero, []);
}
