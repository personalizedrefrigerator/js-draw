/**
 * Solves an equation of the form ax² + bx + c = 0.
 * The larger solution is returned first.
 *
 * If there are no solutions, returns `[NaN, NaN]`. If there is one solution,
 * repeats the solution twice in the result.
 */
const solveQuadratic = (a: number, b: number, c: number): [number, number] => {
	// See also https://en.wikipedia.org/wiki/Quadratic_formula

	if (a === 0) {
		let solution;

		if (b === 0) {
			solution = c === 0 ? 0 : NaN;
		} else {
			// Then we have bx + c = 0
			// which implies bx = -c.
			// Thus, x = -c/b
			solution = -c / b;
		}

		return [solution, solution];
	}

	const discriminant = b * b - 4 * a * c;

	if (discriminant < 0) {
		return [NaN, NaN];
	}

	const rootDiscriminant = Math.sqrt(discriminant);
	const solution1 = (-b + rootDiscriminant) / (2 * a);
	const solution2 = (-b - rootDiscriminant) / (2 * a);

	if (solution1 > solution2) {
		return [solution1, solution2];
	} else {
		return [solution2, solution1];
	}
};
export default solveQuadratic;
