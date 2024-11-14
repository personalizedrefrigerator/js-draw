/**
 * This package contains general math utilities used by `js-draw`.
 * These include 2D and 3D vectors, 2D paths, and 3x3 matrices.
 *
 * ```ts,runnable,console
 * import { Vec2, Mat33, Rect2 } from '@js-draw/math';
 *
 * // Example: Rotate a vector 90 degrees about the z-axis
 * const rotate90Degrees = Mat33.zRotation(Math.PI/2); // π/2 radians = 90 deg
 * const moveUp = Mat33.translation(Vec2.of(1, 0));
 * const moveUpThenRotate = rotate90Degrees.rightMul(moveUp);
 * console.log(moveUpThenRotate.transformVec2(Vec2.of(1, 2)));
 *
 * // Example: Bounding box of some points
 * console.log(Rect2.bboxOf([
 *   Vec2.of(1, 2), Vec2.of(3, 4), Vec2.of(-100, 1000),
 * ]));
 * ```
 *
 * @packageDocumentation
 */

export { LineSegment2 } from './shapes/LineSegment2';
export {
	Path,
	IntersectionResult as PathIntersectionResult,
	CurveIndexRecord as PathCurveIndex,
	stepCurveIndexBy as stepPathIndexBy,
	compareCurveIndices as comparePathIndices,
	PathCommandType,
	PathCommand,
	LinePathCommand,
	MoveToPathCommand,
	QuadraticBezierPathCommand,
	CubicBezierPathCommand,
} from './shapes/Path';
export { Rect2 } from './shapes/Rect2';
export { Parameterized2DShape } from './shapes/Parameterized2DShape';
export { QuadraticBezier } from './shapes/QuadraticBezier';
export { Abstract2DShape } from './shapes/Abstract2DShape';

export { Mat33, Mat33Array } from './Mat33';
export { Point2, Vec2 } from './Vec2';
export { Vec3 } from './Vec3';
export { Color4 } from './Color4';
export * from './rounding/lib';

// Note: All above exports cannot use `export { default as ... } from "..."` because this
// breaks TypeDoc -- TypeDoc otherwise labels any imports of these classes as `default`.
