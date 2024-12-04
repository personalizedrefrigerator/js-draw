import { Point2, Vec2 } from './Vec2';
import Vec3 from './Vec3';

/**
 * See {@link Mat33.toArray}.
 */
export type Mat33Array = [number, number, number, number, number, number, number, number, number];

/**
 * Represents a three dimensional linear transformation or
 * a two-dimensional affine transformation. (An affine transformation scales/rotates/shears
 * **and** translates while a linear transformation just scales/rotates/shears).
 *
 * In addition to other matrices, {@link Mat33}s can be used to transform {@link Vec3}s and {@link Vec2}s.
 *
 * For example, to move the point $(1, 1)$ by 5 units to the left and 6 units up,
 * ```ts,runnable,console
 * import {Mat33, Vec2} from '@js-draw/math';
 *
 * const moveLeftAndUp = Mat33.translation(Vec2.of(5, 6));
 * console.log(moveLeftAndUp);
 * ```
 *
 * This `moveLeftAndUp` matrix could then translate (move) a {@link Vec2} using
 * {@link Mat33.transformVec2}:
 *
 * ```ts,runnable,console
 * ---use-previous---
 * ---visible---
 * console.log(moveLeftAndUp.transformVec2(Vec2.of(1, 1)));
 * console.log(moveLeftAndUp.transformVec2(Vec2.of(-1, 2)));
 * ```
 *
 * It's also possible to create transformation matrices that scale and rotate.
 * A single transform matrix can be created from multiple using matrix multiplication
 * (see {@link Mat33.rightMul}):
 *
 * ```ts,runnable,console
 * ---use-previous---
 * ---visible---
 * // Create a matrix by right multiplying.
 * const scaleThenRotate =
 *   // The resultant matrix first scales by a factor of two
 *   Mat33.scaling2D(2).rightMul(
 *     // ...then rotates by pi/2 radians = 90 degrees.
 *     Mat33.zRotation(Math.PI / 2)
 *   );
 * console.log(scaleThenRotate);
 *
 * // Use scaleThenRotate to scale then rotate a vector.
 * console.log(scaleThenRotate.transformVec2(Vec2.unitX));
 * ```
 */
export class Mat33 {
	private readonly rows: Vec3[];

	/**
	 * Creates a matrix from inputs in the form,
	 * $$
	 * \begin{bmatrix}
	 *   a1 & a2 & a3 \\
	 *   b1 & b2 & b3 \\
	 *   c1 & c2 & c3
	 * \end{bmatrix}
	 * $$
	 *
	 * Static constructor methods are also available.
	 * See {@link Mat33.scaling2D}, {@link Mat33.zRotation}, {@link Mat33.translation}, and {@link Mat33.fromCSSMatrix}.
	 */
	public constructor(
		public readonly a1: number,
		public readonly a2: number,
		public readonly a3: number,

		public readonly b1: number,
		public readonly b2: number,
		public readonly b3: number,

		public readonly c1: number,
		public readonly c2: number,
		public readonly c3: number,
	) {
		this.rows = [Vec3.of(a1, a2, a3), Vec3.of(b1, b2, b3), Vec3.of(c1, c2, c3)];
	}

	/**
	 * Creates a matrix from the given rows:
	 * $$
	 * \begin{bmatrix}
	 *  \texttt{r1.x} & \texttt{r1.y} & \texttt{r1.z}\\
	 *  \texttt{r2.x} & \texttt{r2.y} & \texttt{r2.z}\\
	 *  \texttt{r3.x} & \texttt{r3.y} & \texttt{r3.z}\\
	 * \end{bmatrix}
	 * $$
	 */
	public static ofRows(r1: Vec3, r2: Vec3, r3: Vec3): Mat33 {
		return new Mat33(r1.x, r1.y, r1.z, r2.x, r2.y, r2.z, r3.x, r3.y, r3.z);
	}

	/** The 3x3 [identity matrix](https://en.wikipedia.org/wiki/Identity_matrix). */
	public static identity = new Mat33(1, 0, 0, 0, 1, 0, 0, 0, 1);

	/**
	 * Either returns the inverse of this, or, if this matrix is singular/uninvertable,
	 * returns Mat33.identity.
	 *
	 * This may cache the computed inverse and return the cached version instead of recomputing
	 * it.
	 */
	public inverse(): Mat33 {
		return this.computeInverse() ?? Mat33.identity;
	}

	public invertable(): boolean {
		return this.computeInverse() !== null;
	}

	private cachedInverse: Mat33 | undefined | null = undefined;
	private computeInverse(): Mat33 | null {
		if (this.cachedInverse !== undefined) {
			return this.cachedInverse;
		}

		const toIdentity = [this.rows[0], this.rows[1], this.rows[2]];

		const toResult = [Vec3.unitX, Vec3.unitY, Vec3.unitZ];

		// Convert toIdentity to the identity matrix and
		// toResult to the inverse through elementary row operations
		for (let cursor = 0; cursor < 3; cursor++) {
			// Select the [cursor]th diagonal entry
			let pivot = toIdentity[cursor].at(cursor);

			// Don't divide by zero (treat very small numbers as zero).
			const minDivideBy = 1e-10;
			if (Math.abs(pivot) < minDivideBy) {
				let swapIndex = -1;
				// For all other rows,
				for (let i = 1; i <= 2; i++) {
					const otherRowIdx = (cursor + i) % 3;

					if (Math.abs(toIdentity[otherRowIdx].at(cursor)) >= minDivideBy) {
						swapIndex = otherRowIdx;
						break;
					}
				}

				// Can't swap with another row?
				if (swapIndex === -1) {
					this.cachedInverse = null;
					return null;
				}

				const tmpIdentityRow = toIdentity[cursor];
				const tmpResultRow = toResult[cursor];

				// Swap!
				toIdentity[cursor] = toIdentity[swapIndex];
				toResult[cursor] = toResult[swapIndex];
				toIdentity[swapIndex] = tmpIdentityRow;
				toResult[swapIndex] = tmpResultRow;

				pivot = toIdentity[cursor].at(cursor);
			}

			// Make toIdentity[k = cursor] = 1
			let scale = 1.0 / pivot;
			toIdentity[cursor] = toIdentity[cursor].times(scale);
			toResult[cursor] = toResult[cursor].times(scale);

			const cursorToIdentityRow = toIdentity[cursor];
			const cursorToResultRow = toResult[cursor];

			// Make toIdentity[k ≠ cursor] = 0
			for (let i = 1; i <= 2; i++) {
				const otherRowIdx = (cursor + i) % 3;
				scale = -toIdentity[otherRowIdx].at(cursor);
				toIdentity[otherRowIdx] = toIdentity[otherRowIdx].plus(cursorToIdentityRow.times(scale));
				toResult[otherRowIdx] = toResult[otherRowIdx].plus(cursorToResultRow.times(scale));
			}
		}

		const inverse = Mat33.ofRows(toResult[0], toResult[1], toResult[2]);
		this.cachedInverse = inverse;
		return inverse;
	}

	public transposed(): Mat33 {
		return new Mat33(
			this.a1,
			this.b1,
			this.c1,
			this.a2,
			this.b2,
			this.c2,
			this.a3,
			this.b3,
			this.c3,
		);
	}

	/**
	 * [Right-multiplies](https://en.wikipedia.org/wiki/Matrix_multiplication) this by `other`.
	 *
	 * See also {@link transformVec3} and {@link transformVec2}.
	 *
	 * Example:
	 * ```ts,runnable,console
	 * import {Mat33, Vec2} from '@js-draw/math';
	 * console.log(Mat33.identity.rightMul(Mat33.identity));
	 *
	 * // Create a matrix by right multiplying.
	 * const scaleThenRotate =
	 *   // The resultant matrix first scales by a factor of two
	 *   Mat33.scaling2D(2).rightMul(
	 *     // ...then rotates by pi/4 radians = 45 degrees.
	 *     Mat33.zRotation(Math.PI / 4)
	 *   );
	 * console.log(scaleThenRotate);
	 *
	 * // Use scaleThenRotate to scale then rotate a vector.
	 * console.log(scaleThenRotate.transformVec2(Vec2.unitX));
	 * ```
	 */
	public rightMul(other: Mat33): Mat33 {
		other = other.transposed();

		const at = (row: number, col: number): number => {
			return this.rows[row].dot(other.rows[col]);
		};

		return new Mat33(
			at(0, 0),
			at(0, 1),
			at(0, 2),
			at(1, 0),
			at(1, 1),
			at(1, 2),
			at(2, 0),
			at(2, 1),
			at(2, 2),
		);
	}

	/**
	 * Applies this as an **affine** transformation to the given vector.
	 * Returns a transformed version of `other`.
	 *
	 * Unlike {@link transformVec3}, this **does** translate the given vector.
	 */
	public transformVec2(other: Vec2): Vec2 {
		// When transforming a Vec2, we want to use the z transformation
		// components of this for translation:
		//  ⎡ . . tX ⎤
		//  ⎢ . . tY ⎥
		//  ⎣ 0 0 1  ⎦
		// For this, we need other's z component to be 1 (so that tX and tY
		// are scaled by 1):
		let intermediate = Vec3.of(other.x, other.y, 1);
		intermediate = this.transformVec3(intermediate);

		// Drop the z=1 to allow magnitude to work as expected
		return Vec2.of(intermediate.x, intermediate.y);
	}

	/**
	 * Applies this as a linear transformation to the given vector (doesn't translate).
	 * This is the standard way of transforming vectors in ℝ³.
	 */
	public transformVec3(other: Vec3): Vec3 {
		return Vec3.of(this.rows[0].dot(other), this.rows[1].dot(other), this.rows[2].dot(other));
	}

	/** @returns true iff this is the identity matrix. */
	public isIdentity(): boolean {
		if (this === Mat33.identity) {
			return true;
		}

		return this.eq(Mat33.identity);
	}

	/** Returns true iff this = other ± fuzz */
	public eq(other: Mat33, fuzz: number = 0): boolean {
		for (let i = 0; i < 3; i++) {
			if (!this.rows[i].eq(other.rows[i], fuzz)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Creates a human-readable representation of the matrix.
	 *
	 * Example:
	 * ```ts,runnable,console
	 * import { Mat33 } from '@js-draw/math';
	 * console.log(Mat33.identity.toString());
	 * ```
	 */
	public toString(): string {
		let result = '';
		const maxColumnLens = [0, 0, 0];

		// Determine the longest item in each column so we can pad the others to that
		// length.
		for (const row of this.rows) {
			for (let i = 0; i < 3; i++) {
				maxColumnLens[i] = Math.max(maxColumnLens[0], `${row.at(i)}`.length);
			}
		}

		for (let i = 0; i < 3; i++) {
			if (i === 0) {
				result += '⎡ ';
			} else if (i === 1) {
				result += '⎢ ';
			} else {
				result += '⎣ ';
			}

			// Add each component of the ith row (after padding it)
			for (let j = 0; j < 3; j++) {
				const val = this.rows[i].at(j).toString();

				let padding = '';
				for (let i = val.length; i < maxColumnLens[j]; i++) {
					padding += ' ';
				}

				result += val + ', ' + padding;
			}

			if (i === 0) {
				result += ' ⎤';
			} else if (i === 1) {
				result += ' ⎥';
			} else {
				result += ' ⎦';
			}
			result += '\n';
		}

		return result.trimEnd();
	}

	/**
	 * ```
	 * result[0] = top left element
	 * result[1] = element at row zero, column 1
	 * ...
	 * ```
	 *
	 * Example:
	 * ```ts,runnable,console
	 * import { Mat33 } from '@js-draw/math';
	 * console.log(
	 *   new Mat33(
	 *     1, 2, 3,
	 *     4, 5, 6,
	 *     7, 8, 9,
	 *   )
	 * );
	 * ```
	 */
	public toArray(): Mat33Array {
		return [this.a1, this.a2, this.a3, this.b1, this.b2, this.b3, this.c1, this.c2, this.c3];
	}

	/**
	 * Returns a new `Mat33` where each entry is the output of the function
	 * `mapping`.
	 *
	 * @example
	 * ```
	 * new Mat33(
	 *  1, 2, 3,
	 *  4, 5, 6,
	 *  7, 8, 9,
	 * ).mapEntries(component => component - 1);
	 * // → ⎡ 0, 1, 2 ⎤
	 * //   ⎢ 3, 4, 5 ⎥
	 * //   ⎣ 6, 7, 8 ⎦
	 * ```
	 */
	public mapEntries(mapping: (component: number, rowcol: [number, number]) => number): Mat33 {
		return new Mat33(
			mapping(this.a1, [0, 0]),
			mapping(this.a2, [0, 1]),
			mapping(this.a3, [0, 2]),
			mapping(this.b1, [1, 0]),
			mapping(this.b2, [1, 1]),
			mapping(this.b3, [1, 2]),
			mapping(this.c1, [2, 0]),
			mapping(this.c2, [2, 1]),
			mapping(this.c3, [2, 2]),
		);
	}

	/** Estimate the scale factor of this matrix (based on the first row). */
	public getScaleFactor() {
		return Math.hypot(this.a1, this.a2);
	}

	/** Returns the `idx`-th column (`idx` is 0-indexed). */
	public getColumn(idx: number) {
		return Vec3.of(this.rows[0].at(idx), this.rows[1].at(idx), this.rows[2].at(idx));
	}

	/** Returns the magnitude of the entry with the largest entry */
	public maximumEntryMagnitude() {
		let greatestSoFar = Math.abs(this.a1);
		for (const entry of this.toArray()) {
			greatestSoFar = Math.max(greatestSoFar, Math.abs(entry));
		}

		return greatestSoFar;
	}

	/**
	 * Constructs a 3x3 translation matrix (for translating `Vec2`s) using
	 * **transformVec2**.
	 *
	 * Creates a matrix in the form
	 * $$
	 * 	\begin{pmatrix}
	 * 		1 & 0 & {\tt amount.x}\\
	 * 		0 & 1 & {\tt amount.y}\\
	 * 		0 & 0 & 1
	 * 	\end{pmatrix}
	 * $$
	 */
	public static translation(amount: Vec2): Mat33 {
		// When transforming Vec2s by a 3x3 matrix, we give the input
		// Vec2s z = 1. As such,
		//   outVec2.x = inVec2.x * 1 + inVec2.y * 0 + 1 * amount.x
		//   ...
		return new Mat33(1, 0, amount.x, 0, 1, amount.y, 0, 0, 1);
	}

	/**
	 * Creates a matrix for rotating `Vec2`s about `center` by some number of `radians`.
	 *
	 * For this function, {@link Vec2}s are considered to be points in 2D space.
	 *
	 * For example,
	 * ```ts,runnable,console
	 * import { Mat33, Vec2 } from '@js-draw/math';
	 *
	 * const halfCircle = Math.PI; // PI radians = 180 degrees = 1/2 circle
	 * const center = Vec2.of(1, 1); // The point (1,1)
	 * const rotationMatrix = Mat33.zRotation(halfCircle, center);
	 *
	 * console.log(
	 *   'Rotating (0,0) 180deg about', center, 'results in',
	 *   // Rotates (0,0)
	 *   rotationMatrix.transformVec2(Vec2.zero),
	 * );
	 * ```
	 */
	public static zRotation(radians: number, center: Point2 = Vec2.zero): Mat33 {
		if (radians === 0) {
			return Mat33.identity;
		}

		const cos = Math.cos(radians);
		const sin = Math.sin(radians);

		// Translate everything so that rotation is about the origin
		let result = Mat33.translation(center);

		result = result.rightMul(new Mat33(cos, -sin, 0, sin, cos, 0, 0, 0, 1));
		return result.rightMul(Mat33.translation(center.times(-1)));
	}

	public static scaling2D(amount: number | Vec2, center: Point2 = Vec2.zero): Mat33 {
		let result = Mat33.translation(center);
		let xAmount, yAmount;

		if (typeof amount === 'number') {
			xAmount = amount;
			yAmount = amount;
		} else {
			xAmount = amount.x;
			yAmount = amount.y;
		}

		result = result.rightMul(new Mat33(xAmount, 0, 0, 0, yAmount, 0, 0, 0, 1));

		// Translate such that [center] goes to (0, 0)
		return result.rightMul(Mat33.translation(center.times(-1)));
	}

	/**
	 * **Note**: Assumes `this.c1 = this.c2 = 0` and `this.c3 = 1`.
	 *
	 * @see {@link fromCSSMatrix}
	 */
	public toCSSMatrix(): string {
		return `matrix(${this.a1},${this.b1},${this.a2},${this.b2},${this.a3},${this.b3})`;
	}

	/**
	 * Converts a CSS-form `matrix(a, b, c, d, e, f)` to a Mat33.
	 *
	 * Note that such a matrix has the form,
	 * ```
	 * ⎡ a c e ⎤
	 * ⎢ b d f ⎥
	 * ⎣ 0 0 1 ⎦
	 * ```
	 */
	public static fromCSSMatrix(cssString: string): Mat33 {
		if (cssString === '' || cssString === 'none') {
			return Mat33.identity;
		}
		// Normalize spacing
		cssString = cssString.trim().replace(/\s+/g, ' ');

		const parseArguments = (argumentString: string): number[] => {
			const parsed = argumentString.split(/[, \t\n]+/g).map((argString) => {
				// Handle trailing spaces/commands
				if (argString.trim() === '') {
					return null;
				}

				let isPercentage = false;
				if (argString.endsWith('%')) {
					isPercentage = true;
					argString = argString.substring(0, argString.length - 1);
				}

				// Remove trailing px units.
				argString = argString.replace(/px$/gi, '');

				const numberExp = /^[-]?\d*(?:\.\d*)?(?:[eE][-+]?\d+)?$/i;

				if (!numberExp.exec(argString)) {
					throw new Error(
						`All arguments to transform functions must be numeric (state: ${JSON.stringify({
							currentArgument: argString,
							allArguments: argumentString,
						})})`,
					);
				}

				let argNumber = parseFloat(argString);

				if (isPercentage) {
					argNumber /= 100;
				}

				return argNumber;
			});
			return parsed.filter((n) => n !== null);
		};

		const keywordToAction = {
			matrix: (matrixData: number[]) => {
				if (matrixData.length !== 6) {
					throw new Error(`Invalid matrix argument: ${matrixData}. Must have length 6`);
				}

				const a = matrixData[0];
				const b = matrixData[1];
				const c = matrixData[2];
				const d = matrixData[3];
				const e = matrixData[4];
				const f = matrixData[5];

				const transform = new Mat33(a, c, e, b, d, f, 0, 0, 1);
				return transform;
			},

			scale: (scaleArgs: number[]) => {
				let scaleX, scaleY;
				if (scaleArgs.length === 1) {
					scaleX = scaleArgs[0];
					scaleY = scaleArgs[0];
				} else if (scaleArgs.length === 2) {
					scaleX = scaleArgs[0];
					scaleY = scaleArgs[1];
				} else {
					throw new Error(`The scale() function only supports two arguments. Given: ${scaleArgs}`);
				}

				return Mat33.scaling2D(Vec2.of(scaleX, scaleY));
			},

			translate: (translateArgs: number[]) => {
				let translateX = 0;
				let translateY = 0;

				if (translateArgs.length === 1) {
					// If no y translation is given, assume 0.
					translateX = translateArgs[0];
				} else if (translateArgs.length === 2) {
					translateX = translateArgs[0];
					translateY = translateArgs[1];
				} else {
					throw new Error(
						`The translate() function requires either 1 or 2 arguments. Given ${translateArgs}`,
					);
				}

				return Mat33.translation(Vec2.of(translateX, translateY));
			},
		};

		// A command (\w+)
		// followed by a set of arguments ([^)]*)
		const partRegex = /(?:^|\W)(\w+)\s?\(([^)]*)\)/gi;
		let match;
		let matrix: Mat33 | null = null;

		while ((match = partRegex.exec(cssString)) !== null) {
			const action = match[1].toLowerCase();
			if (!(action in keywordToAction)) {
				throw new Error(`Unsupported CSS transform action: ${action}`);
			}

			const args = parseArguments(match[2]);
			const currentMatrix = keywordToAction[action as keyof typeof keywordToAction](args);

			if (!matrix) {
				matrix = currentMatrix;
			} else {
				matrix = matrix.rightMul(currentMatrix);
			}
		}

		return matrix ?? Mat33.identity;
	}
}
export default Mat33;
