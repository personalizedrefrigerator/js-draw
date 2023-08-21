/**
 * # `@js-draw/math`
 *
 * @packageDocumentation
 */

export { LineSegment2 } from './shapes/LineSegment2';
export {
	Path,

	PathCommandType,
	PathCommand,
	LinePathCommand,
	MoveToPathCommand,
	QuadraticBezierPathCommand,
	CubicBezierPathCommand,
} from './shapes/Path';
export { Rect2 } from './shapes/Rect2';
export { QuadraticBezier } from './shapes/QuadraticBezier';

export { Mat33, Mat33Array } from './Mat33';
export { Point2, Vec2 } from './Vec2';
export { Vec3 } from './Vec3';
export { Color4 } from './Color4';
export { toRoundedString } from './rounding';


// Note: All above exports cannot use `export { default as ... } from "..."` because this
// breaks TypeDoc -- TypeDoc otherwise labels any imports of these classes as `default`.
