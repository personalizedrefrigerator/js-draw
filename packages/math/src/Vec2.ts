import Vec3 from './Vec3';

/**
 * Utility functions that facilitate treating `Vec3`s as 2D vectors.
 *
 * @example
 * ```ts,runnable,console
 * import { Vec2 } from '@js-draw/math';
 * console.log(Vec2.of(1, 2));
 * ```
 */
export namespace Vec2 {
	/**
	 * Creates a `Vec2` from an x and y coordinate.
	 *
	 * For example,
	 * ```ts
	 * const v = Vec2.of(3, 4); // x=3, y=4.
	 * ```
	 */
	export const of = (x: number, y: number): Vec2 => {
		return Vec3.of(x, y, 0);
	};

	/**
	 * Creates a `Vec2` from an object containing x and y coordinates.
	 *
	 * For example,
	 * ```ts
	 * const v1 = Vec2.ofXY({ x: 3, y: 4.5 });
	 * const v2 = Vec2.ofXY({ x: -123.4, y: 1 });
	 * ```
	 */
	export const ofXY = ({x, y}: { x: number, y: number }): Vec2 => {
		return Vec3.of(x, y, 0);
	};

	/** A vector of length 1 in the X direction (→). */
	export const unitX = Vec2.of(1, 0);

	/** A vector of length 1 in the Y direction (↑). */
	export const unitY = Vec2.of(0, 1);

	/** The zero vector: A vector with x=0, y=0. */
	export const zero = Vec2.of(0, 0);
}

export type Point2 = Vec3;
export type Vec2 = Vec3; // eslint-disable-line