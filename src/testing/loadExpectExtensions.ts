export const loadExpectExtensions = () => {
	// Custom matchers. See
	// https://jestjs.io/docs/expect#expectextendmatchers
	expect.extend({
		// Determine whether expected = actual based on the objects'
		// .eq methods
		objEq(actual: any, expected: any, ...eqArgs: any) {
			let pass = false;
			if ((expected ?? null) === null) {
				pass = actual.eq(expected, ...eqArgs);
			} else {
				pass = expected.eq(actual, ...eqArgs);
			}

			return {
				pass,
				message: () => {
					return `Expected ${pass ? '!' : ''}(${actual}).eq(${expected}). Options(${eqArgs})`;
				},
			};
		},
	});
};

export default loadExpectExtensions;