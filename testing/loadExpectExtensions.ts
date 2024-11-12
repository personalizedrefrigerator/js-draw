type Equalable = { eq: (other: unknown, ...args: any[]) => boolean };

export const loadExpectExtensions = () => {
	// Custom matchers. See
	// https://jestjs.io/docs/expect#expectextendmatchers
	expect.extend({
		// Determine whether expected = actual based on the objects'
		// .eq methods
		objEq(actual: Equalable, expected: Equalable | undefined | null, ...eqArgs: any[]) {
			let pass = false;
			if (!expected) {
				pass = actual.eq(expected, ...eqArgs);
			} else {
				pass = expected.eq(actual, ...eqArgs);
			}

			return {
				pass,
				message: () => {
					return `Expected ${pass ? '!' : ''}(${actual as unknown}).eq(${expected}). Options(${eqArgs})`;
				},
			};
		},
		toHaveEntriesCloseTo(actual: number[], expected: number[], tolerance: number = 1e-5) {
			if (actual.length !== expected.length) {
				return {
					pass: false,
					message: () => {
						return `Wrong length (actual: ${actual.length}, expected: ${expected.length}) (${JSON.stringify({ expected, actual })})`;
					},
				};
			}

			for (let i = 0; i < expected.length; i++) {
				if (Math.abs(expected[i] - actual[i]) > tolerance) {
					return {
						pass: false,
						message: () =>
							`Entry ${i}: ${expected[i]} and ${actual[i]} are not within ${tolerance}. (${JSON.stringify({ expected, actual })})`,
					};
				}
			}

			return { pass: true, message: () => 'All entries are close' };
		},
	});
};

export default loadExpectExtensions;
