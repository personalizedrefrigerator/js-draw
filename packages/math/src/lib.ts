/**
 * # `@js-draw/math`
 *
 * @example
 *
 * ```ts,runnable,console
 * import { Vec3 } from '@js-draw/math';
 * console.log(Vec3.of(1, 2, 3).plus(Vec3.of(0, 1, 0)));
 * console.log(Vec3.of(1, 2, 3).times(2));
 * ```
 *
 * @packageDocumentation
 */

export { default as LineSegment2 } from './shapes/LineSegment2';
export {
	default as Path,

	PathCommandType,
	PathCommand,
	LinePathCommand,
	MoveToPathCommand,
	QuadraticBezierPathCommand,
	CubicBezierPathCommand,
} from './shapes/Path';
export { default as Rect2 } from './shapes/Rect2';
export { default as QuadraticBezier } from './shapes/QuadraticBezier';

export { default as Mat33, Mat33Array } from './Mat33';
export { Point2, Vec2 } from './Vec2';
export { default as Vec3 } from './Vec3';
export { default as Color4 } from './Color4';
export { toRoundedString } from './rounding';
