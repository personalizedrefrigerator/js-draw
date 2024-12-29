/**
 * A vector with three components, $\begin{pmatrix} x \\ y \\ z \end{pmatrix}$.
 * Can also be used to represent a two-component vector.
 *
 * A `Vec3` is immutable.
 *
 * @example
 *
 * ```ts,runnable,console
 * import { Vec3 } from '@js-draw/math';
 *
 * console.log('Vector addition:', Vec3.of(1, 2, 3).plus(Vec3.of(0, 1, 0)));
 * console.log('Scalar multiplication:', Vec3.of(1, 2, 3).times(2));
 * console.log('Cross products:', Vec3.unitX.cross(Vec3.unitY));
 * console.log('Magnitude:', Vec3.of(1, 2, 3).length(), 'or', Vec3.of(1, 2, 3).magnitude());
 * console.log('Square Magnitude:', Vec3.of(1, 2, 3).magnitudeSquared());
 * console.log('As an array:', Vec3.unitZ.asArray());
 * ```
 */
export interface Vec3 {
	readonly x: number;
	readonly y: number;
	readonly z: number;

	/**
	 * Returns the x, y components of this.
	 * May be implemented as a getter method.
	 */
	readonly xy: { x: number; y: number };

	/** Returns the vector's `idx`th component. For example, `Vec3.of(1, 2, 3).at(1) → 2`. */
	at(i: number): number;

	/** Alias for `.magnitude`. */
	length(): number;
	/** Returns the length of this vector in ℝ^3. */
	magnitude(): number;
	magnitudeSquared(): number;

	/**
	 * Interpreting this vector as a point in ℝ^3, computes the square distance
	 * to another point, `p`.
	 *
	 * Equivalent to `.minus(p).magnitudeSquared()`.
	 */
	squareDistanceTo(other: Vec3): number;

	/**
	 * Interpreting this vector as a point in ℝ³, returns the distance to the point
	 * `p`.
	 *
	 * Equivalent to `.minus(p).magnitude()`.
	 */
	distanceTo(p: Vec3): number;

	/**
	 * Returns the entry of this with the greatest magnitude.
	 *
	 * In other words, returns $\max \{ |x| : x \in {\bf v} \}$, where ${\bf v}$ is the set of
	 * all entries of this vector.
	 *
	 * **Example**:
	 * ```ts,runnable,console
	 * import { Vec3 } from '@js-draw/math';
	 * console.log(Vec3.of(-1, -10, 8).maximumEntryMagnitude()); // -> 10
	 * ```
	 */
	maximumEntryMagnitude(): number;

	/**
	 * Return this' angle in the XY plane (treats this as a Vec2).
	 *
	 * This is equivalent to `Math.atan2(vec.y, vec.x)`.
	 *
	 * As such, observing that `Math.atan2(-0, -1)` $\approx -\pi$ and `Math.atan2(0, -1)` $\approx \pi$
	 * the resultant angle is in the range $[-\pi, \pi]$.
	 *
	 * **Example**:
	 * ```ts,runnable,console
	 * import { Vec2 } from '@js-draw/math';
	 * console.log(Vec2.of(-1, -0).angle()); // atan2(-0, -1)
	 * console.log(Vec2.of(-1, 0).angle());  // atan2(0, -1)
	 * ```
	 */
	angle(): number;

	/**
	 * Returns a unit vector in the same direction as this.
	 *
	 * If `this` has zero length, the resultant vector has `NaN` components.
	 */
	normalized(): Vec3;

	/**
	 * Like {@link normalized}, except returns zero if this has zero magnitude.
	 */
	normalizedOrZero(): Vec3;

	/** @returns A copy of `this` multiplied by a scalar. */
	times(c: number): Vec3;

	/** Performs vector addition. */
	plus(v: Vec3): Vec3;
	minus(v: Vec3): Vec3;

	/**
	 * Computes the scalar product between this and `v`.
	 *
	 * In particular, `a.dot(b)` is equivalent to `a.x * b.x + a.y * b.y + a.z * b.z`.
	 */
	dot(v: Vec3): number;

	/** Computes the cross product between this and `v` */
	cross(v: Vec3): Vec3;

	/**
	 * If `other` is a `Vec3`, multiplies `this` component-wise by `other`. Otherwise,
	 * if `other is a `number`, returns the result of scalar multiplication.
	 *
	 * @example
	 * ```
	 * Vec3.of(1, 2, 3).scale(Vec3.of(2, 4, 6)); // → Vec3(2, 8, 18)
	 * ```
	 */
	scale(other: Vec3 | number): Vec3;

	/**
	 * Returns a vector orthogonal to this. If this is a Vec2, returns `this` rotated
	 * 90 degrees counter-clockwise.
	 */
	orthog(): Vec3;

	/** Returns this plus a vector of length `distance` in `direction`. */
	extend(distance: number, direction: Vec3): Vec3;

	/** Returns a vector `fractionTo` of the way to target from this. */
	lerp(target: Vec3, fractionTo: number): Vec3;

	/**
	 * `zip` Maps a component of this and a corresponding component of
	 * `other` to a component of the output vector.
	 *
	 * @example
	 * ```
	 * const a = Vec3.of(1, 2, 3);
	 * const b = Vec3.of(0.5, 2.1, 2.9);
	 *
	 * const zipped = a.zip(b, (aComponent, bComponent) => {
	 *   return Math.min(aComponent, bComponent);
	 * });
	 *
	 * console.log(zipped.toString()); // → Vec(0.5, 2, 2.9)
	 * ```
	 */
	zip(other: Vec3, zip: (componentInThis: number, componentInOther: number) => number): Vec3;

	/**
	 * Returns a vector with each component acted on by `fn`.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Vec3 } from '@js-draw/math';
	 * console.log(Vec3.of(1, 2, 3).map(val => val + 1)); // → Vec(2, 3, 4)
	 * ```
	 */
	map(fn: (component: number, index: number) => number): Vec3;

	asArray(): [number, number, number];

	/**
	 * @param tolerance The maximum difference between two components for this and [other]
	 * to be considered equal.
	 *
	 * @example
	 * ```
	 * Vec3.of(1, 2, 3).eq(Vec3.of(4, 5, 6), 100);  // → true
	 * Vec3.of(1, 2, 3).eq(Vec3.of(4, 5, 6), 0.1);  // → false
	 * Vec3.of(1, 2, 3).eq(Vec3.of(4, 5, 6), 3);    // → true
	 * Vec3.of(1, 2, 3).eq(Vec3.of(4, 5, 6), 3.01); // → true
	 * Vec3.of(1, 2, 3).eq(Vec3.of(4, 5, 6), 2.99); // → false
	 * ```
	 */
	eq(other: Vec3, tolerance?: number): boolean;

	toString(): string;
}

const defaultEqlTolerance = 1e-10;

class Vec3Impl implements Vec3 {
	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number,
	) {}

	public get xy(): { x: number; y: number } {
		// Useful for APIs that behave differently if .z is present.
		return {
			x: this.x,
			y: this.y,
		};
	}

	/** Returns this' `idx`th component. For example, `Vec3.of(1, 2, 3).at(1) → 2`. */
	public at(idx: number): number {
		if (idx === 0) return this.x;
		if (idx === 1) return this.y;
		if (idx === 2) return this.z;

		throw new Error(`${idx} out of bounds!`);
	}

	public length(): number {
		return this.magnitude();
	}

	public magnitude(): number {
		return Math.sqrt(this.magnitudeSquared());
	}

	public magnitudeSquared(): number {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	public squareDistanceTo(p: Vec3) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		const dz = this.z - p.z;
		return dx * dx + dy * dy + dz * dz;
	}

	public distanceTo(p: Vec3) {
		return Math.sqrt(this.squareDistanceTo(p));
	}

	public maximumEntryMagnitude(): number {
		return Math.max(Math.abs(this.x), Math.max(Math.abs(this.y), Math.abs(this.z)));
	}

	public angle(): number {
		return Math.atan2(this.y, this.x);
	}

	public normalized(): Vec3 {
		const norm = this.magnitude();
		return Vec3.of(this.x / norm, this.y / norm, this.z / norm);
	}

	public normalizedOrZero(): Vec3 {
		if (this.eq(Vec3.zero)) {
			return Vec3.zero;
		}

		return this.normalized();
	}

	public times(c: number): Vec3 {
		return Vec3.of(this.x * c, this.y * c, this.z * c);
	}

	public plus(v: Vec3): Vec3 {
		return Vec3.of(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	public minus(v: Vec3): Vec3 {
		return Vec3.of(this.x - v.x, this.y - v.y, this.z - v.z);
	}

	public dot(other: Vec3): number {
		return this.x * other.x + this.y * other.y + this.z * other.z;
	}

	public cross(other: Vec3): Vec3 {
		// | i  j  k |
		// | x1 y1 z1| = (i)(y1z2 - y2z1) - (j)(x1z2 - x2z1) + (k)(x1y2 - x2y1)
		// | x2 y2 z2|
		return Vec3.of(
			this.y * other.z - other.y * this.z,
			other.x * this.z - this.x * other.z,
			this.x * other.y - other.x * this.y,
		);
	}

	public scale(other: Vec3 | number): Vec3 {
		if (typeof other === 'number') {
			return this.times(other);
		}

		return Vec3.of(this.x * other.x, this.y * other.y, this.z * other.z);
	}

	public orthog(): Vec3 {
		// If parallel to the z-axis
		if (this.dot(Vec3.unitX) === 0 && this.dot(Vec3.unitY) === 0) {
			return this.dot(Vec3.unitX) === 0 ? Vec3.unitX : this.cross(Vec3.unitX).normalized();
		}

		return this.cross(Vec3.unitZ.times(-1)).normalized();
	}

	public extend(distance: number, direction: Vec3): Vec3 {
		return this.plus(direction.normalized().times(distance));
	}

	public lerp(target: Vec3, fractionTo: number): Vec3 {
		return this.times(1 - fractionTo).plus(target.times(fractionTo));
	}

	public zip(
		other: Vec3,
		zip: (componentInThis: number, componentInOther: number) => number,
	): Vec3 {
		return Vec3.of(zip(other.x, this.x), zip(other.y, this.y), zip(other.z, this.z));
	}

	public map(fn: (component: number, index: number) => number): Vec3 {
		return Vec3.of(fn(this.x, 0), fn(this.y, 1), fn(this.z, 2));
	}

	public asArray(): [number, number, number] {
		return [this.x, this.y, this.z];
	}

	public eq(other: Vec3, fuzz: number = defaultEqlTolerance): boolean {
		return (
			Math.abs(other.x - this.x) <= fuzz &&
			Math.abs(other.y - this.y) <= fuzz &&
			Math.abs(other.z - this.z) <= fuzz
		);
	}

	public toString(): string {
		return `Vec(${this.x}, ${this.y}, ${this.z})`;
	}
}

class Vec2Impl implements Vec3 {
	public constructor(
		public readonly x: number,
		public readonly y: number,
	) {}

	public get z() {
		return 0;
	}

	public get xy(): { x: number; y: number } {
		// Useful for APIs that behave differently if .z is present.
		return {
			x: this.x,
			y: this.y,
		};
	}

	public at(idx: number): number {
		if (idx === 0) return this.x;
		if (idx === 1) return this.y;
		if (idx === 2) return 0;

		throw new Error(`${idx} out of bounds!`);
	}

	public length(): number {
		return this.magnitude();
	}

	public magnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	public magnitudeSquared(): number {
		return this.x * this.x + this.y * this.y;
	}

	public squareDistanceTo(p: Vec3) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		return dx * dx + dy * dy + p.z * p.z;
	}

	public distanceTo(p: Vec3) {
		return Math.sqrt(this.squareDistanceTo(p));
	}

	public maximumEntryMagnitude(): number {
		return Math.max(Math.abs(this.x), Math.abs(this.y));
	}

	public angle(): number {
		return Math.atan2(this.y, this.x);
	}

	public normalized(): Vec3 {
		const norm = this.magnitude();
		return Vec2.of(this.x / norm, this.y / norm);
	}

	public normalizedOrZero(): Vec3 {
		if (this.eq(Vec3.zero)) {
			return Vec3.zero;
		}

		return this.normalized();
	}

	public times(c: number): Vec3 {
		return Vec2.of(this.x * c, this.y * c);
	}

	public plus(v: Vec3): Vec3 {
		return Vec3.of(this.x + v.x, this.y + v.y, v.z);
	}

	public minus(v: Vec3): Vec3 {
		return Vec3.of(this.x - v.x, this.y - v.y, -v.z);
	}

	public dot(other: Vec3): number {
		return this.x * other.x + this.y * other.y;
	}

	public cross(other: Vec3): Vec3 {
		// | i  j  k |
		// | x1 y1 z1| = (i)(y1z2 - y2z1) - (j)(x1z2 - x2z1) + (k)(x1y2 - x2y1)
		// | x2 y2 z2|
		return Vec3.of(this.y * other.z, -this.x * other.z, this.x * other.y - other.x * this.y);
	}

	public scale(other: Vec3 | number): Vec3 {
		if (typeof other === 'number') {
			return this.times(other);
		}

		return Vec2.of(this.x * other.x, this.y * other.y);
	}

	public orthog(): Vec3 {
		// If parallel to the z-axis
		if (this.dot(Vec3.unitX) === 0 && this.dot(Vec3.unitY) === 0) {
			return this.dot(Vec3.unitX) === 0 ? Vec3.unitX : this.cross(Vec3.unitX).normalized();
		}

		return this.cross(Vec3.unitZ.times(-1)).normalized();
	}

	public extend(distance: number, direction: Vec3): Vec3 {
		return this.plus(direction.normalized().times(distance));
	}

	public lerp(target: Vec3, fractionTo: number): Vec3 {
		return this.times(1 - fractionTo).plus(target.times(fractionTo));
	}

	public zip(
		other: Vec3,
		zip: (componentInThis: number, componentInOther: number) => number,
	): Vec3 {
		return Vec3.of(zip(other.x, this.x), zip(other.y, this.y), zip(other.z, 0));
	}

	public map(fn: (component: number, index: number) => number): Vec3 {
		return Vec3.of(fn(this.x, 0), fn(this.y, 1), fn(0, 2));
	}

	public asArray(): [number, number, number] {
		return [this.x, this.y, 0];
	}

	public eq(other: Vec3, fuzz: number = defaultEqlTolerance): boolean {
		return (
			Math.abs(other.x - this.x) <= fuzz &&
			Math.abs(other.y - this.y) <= fuzz &&
			Math.abs(other.z) <= fuzz
		);
	}

	public toString(): string {
		return `Vec(${this.x}, ${this.y})`;
	}
}

/**
 * A `Vec2` is a {@link Vec3} optimized for working in a plane. `Vec2`s have an
 * always-zero `z` component.
 *
 * ```ts,runnable,console
 * import { Vec2 } from '@js-draw/math';
 *
 * const v = Vec2.of(1, 2);
 * console.log('a Vec2:', v);
 * console.log('x component:', v.x);
 * console.log('z component:', v.z);
 * ```
 */
export namespace Vec2 {
	/**
	 * Creates a `Vec2` from an x and y coordinate.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Vec2 } from '@js-draw/math';
	 * const v = Vec2.of(3, 4); // x=3, y=4.
	 * ```
	 */
	export const of = (x: number, y: number) => {
		return new Vec2Impl(x, y);
	};

	/**
	 * Creates a `Vec2` from an object containing `x` and `y` coordinates.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Vec2 } from '@js-draw/math';
	 * const v1 = Vec2.ofXY({ x: 3, y: 4.5 });
	 * const v2 = Vec2.ofXY({ x: -123.4, y: 1 });
	 * ```
	 */
	export const ofXY = ({ x, y }: { x: number; y: number }) => {
		return Vec2.of(x, y);
	};

	/** A vector of length 1 in the X direction (→). */
	export const unitX = Vec2.of(1, 0);

	/** A vector of length 1 in the Y direction (↑). */
	export const unitY = Vec2.of(0, 1);

	/** The zero vector: A vector with x=0, y=0. */
	export const zero = Vec2.of(0, 0);
}

/** Contains static methods for constructing a {@link Vec3}. */
export namespace Vec3 {
	/**
	 * Construct a vector from three components.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Vec3 } from '@js-draw/math';
	 * const v1 = Vec3.of(1, 2, 3);
	 * console.log(v1.plus(Vec3.of(0, 100, 0)));
	 * ```
	 */
	export const of = (x: number, y: number, z: number): Vec3 => {
		if (z === 0) {
			return Vec2.of(x, y);
		} else {
			return new Vec3Impl(x, y, z);
		}
	};

	/** A unit vector in the x direction (`[1, 0, 0]`). */
	export const unitX = Vec2.unitX;
	/** A unit vector in the y direction (`[0, 1, 0]`). */
	export const unitY = Vec2.unitY;
	/** The zero vector (`[0, 0, 0]`). */
	export const zero = Vec2.zero;

	/** A vector of length 1 in the z direction. */
	export const unitZ = Vec3.of(0, 0, 1);
}

export default Vec3;
