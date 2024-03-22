

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
export class Vec3 {
	private constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number
	) {
	}

	/** Returns the x, y components of this. */
	public get xy(): { x: number; y: number } {
		// Useful for APIs that behave differently if .z is present.
		return {
			x: this.x,
			y: this.y,
		};
	}

	/** Construct a vector from three components. */
	public static of(x: number, y: number, z: number): Vec3 {
		return new Vec3(x, y, z);
	}

	/** Returns this' `idx`th component. For example, `Vec3.of(1, 2, 3).at(1) → 2`. */
	public at(idx: number): number {
		if (idx === 0) return this.x;
		if (idx === 1) return this.y;
		if (idx === 2) return this.z;

		throw new Error(`${idx} out of bounds!`);
	}

	/** Alias for this.magnitude. */
	public length(): number {
		return this.magnitude();
	}

	public magnitude(): number {
		return Math.sqrt(this.dot(this));
	}

	public magnitudeSquared(): number {
		return this.dot(this);
	}

	/**
	 * Interpreting this vector as a point in ℝ^3, computes the square distance
	 * to another point, `p`.
	 *
	 * Equivalent to `.minus(p).magnitudeSquared()`.
	 */
	public squareDistanceTo(p: Vec3) {
		const dx = this.x - p.x;
		const dy = this.y - p.y;
		const dz = this.z - p.z;
		return dx * dx + dy * dy + dz * dz;
	}

	/**
	 * Interpreting this vector as a point in ℝ³, returns the distance to the point
	 * `p`.
	 *
	 * Equivalent to `.minus(p).magnitude()`.
	 */
	public distanceTo(p: Vec3) {
		return Math.sqrt(this.squareDistanceTo(p));
	}

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
	public maximumEntryMagnitude(): number {
		return Math.max(Math.abs(this.x), Math.max(Math.abs(this.y), Math.abs(this.z)));
	}

	/**
	 * Return this' angle in the XY plane (treats this as a Vec2).
	 *
	 * This is equivalent to `Math.atan2(vec.y, vec.x)`.
	 *
	 * As such, observing that `Math.atan2(-0, -1)` $\approx -\pi$ and `Math.atan2(0, -1)`$\approx \pi$
	 * the resultant angle is in the range $[-\pi, pi]$.
	 *
	 * **Example**:
	 * ```ts,runnable,console
	 * import { Vec2 } from '@js-draw/math';
	 * console.log(Vec2.of(-1, -0).angle()); // atan2(-0, -1)
	 * console.log(Vec2.of(-1, 0).angle());  // atan2(0, -1)
	 * ```
	 */
	public angle(): number {
		return Math.atan2(this.y, this.x);
	}

	/**
	 * Returns a unit vector in the same direction as this.
	 *
	 * If `this` has zero length, the resultant vector has `NaN` components.
	 */
	public normalized(): Vec3 {
		const norm = this.magnitude();
		return Vec3.of(this.x / norm, this.y / norm, this.z / norm);
	}

	/**
	 * Like {@link normalized}, except returns zero if this has zero magnitude.
	 */
	public normalizedOrZero(): Vec3 {
		if (this.eq(Vec3.zero)) {
			return Vec3.zero;
		}

		return this.normalized();
	}

	/** @returns A copy of `this` multiplied by a scalar. */
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
			this.x * other.y - other.x * this.y
		);
	}

	/**
	 * If `other` is a `Vec3`, multiplies `this` component-wise by `other`. Otherwise,
	 * if `other is a `number`, returns the result of scalar multiplication.
	 *
	 * @example
	 * ```
	 * Vec3.of(1, 2, 3).scale(Vec3.of(2, 4, 6)); // → Vec3(2, 8, 18)
	 * ```
	 */
	public scale(other: Vec3|number): Vec3 {
		if (typeof other === 'number') {
			return this.times(other);
		}

		return Vec3.of(
			this.x * other.x,
			this.y * other.y,
			this.z * other.z,
		);
	}

	/**
	 * Returns a vector orthogonal to this. If this is a Vec2, returns `this` rotated
	 * 90 degrees counter-clockwise.
	 */
	public orthog(): Vec3 {
		// If parallel to the z-axis
		if (this.dot(Vec3.unitX) === 0 && this.dot(Vec3.unitY) === 0) {
			return this.dot(Vec3.unitX) === 0 ? Vec3.unitX : this.cross(Vec3.unitX).normalized();
		}

		return this.cross(Vec3.unitZ.times(-1)).normalized();
	}

	/** Returns this plus a vector of length `distance` in `direction`. */
	public extend(distance: number, direction: Vec3): Vec3 {
		return this.plus(direction.normalized().times(distance));
	}

	/** Returns a vector `fractionTo` of the way to target from this. */
	public lerp(target: Vec3, fractionTo: number): Vec3 {
		return this.times(1 - fractionTo).plus(target.times(fractionTo));
	}

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
	public zip(
		other: Vec3, zip: (componentInThis: number, componentInOther: number)=> number
	): Vec3 {
		return Vec3.of(
			zip(other.x, this.x),
			zip(other.y, this.y),
			zip(other.z, this.z)
		);
	}

	/**
	 * Returns a vector with each component acted on by `fn`.
	 *
	 * @example
	 * ```ts,runnable,console
	 * import { Vec3 } from '@js-draw/math';
	 * console.log(Vec3.of(1, 2, 3).map(val => val + 1)); // → Vec(2, 3, 4)
	 * ```
	 */
	public map(fn: (component: number, index: number)=> number): Vec3 {
		return Vec3.of(
			fn(this.x, 0), fn(this.y, 1), fn(this.z, 2)
		);
	}

	public asArray(): [ number, number, number ] {
		return [this.x, this.y, this.z];
	}

	/**
	 * [fuzz] The maximum difference between two components for this and [other]
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
	public eq(other: Vec3, fuzz: number = 1e-10): boolean {
		return (
			Math.abs(other.x - this.x) <= fuzz
			&& Math.abs(other.y - this.y) <= fuzz
			&& Math.abs(other.z - this.z) <= fuzz
		);
	}

	public toString(): string {
		return `Vec(${this.x}, ${this.y}, ${this.z})`;
	}


	public static unitX = Vec3.of(1, 0, 0);
	public static unitY = Vec3.of(0, 1, 0);
	public static unitZ = Vec3.of(0, 0, 1);
	public static zero = Vec3.of(0, 0, 0);
}
export default Vec3;
