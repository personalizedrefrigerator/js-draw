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

// Type declarations for custom matchers
export interface CustomMatchers<R = unknown> {
	objEq(expected: {
		eq: (other: any, ...args: any)=> boolean;
	}, ...opts: any): R;
}

declare global {
	export namespace jest {
		interface Expect extends CustomMatchers {}
		interface Matchers<R> extends CustomMatchers<R> {}
		interface AsyncAsymmetricMatchers extends CustomMatchers {}
	}
}

export default loadExpectExtensions;