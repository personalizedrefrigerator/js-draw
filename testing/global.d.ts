/* eslint-disable @typescript-eslint/no-empty-object-type */

// Type declarations for custom matchers
interface CustomMatchers<R = unknown> {
	objEq<Args extends unknown[]>(
		expected: {
			eq: (other: any, ...args: Args) => boolean;
		},
		...opts: unknown[]
	): R;

	toHaveEntriesCloseTo(expected: number[], tolerance?: number): R;
}

declare namespace jest {
	interface Expect extends CustomMatchers {}
	interface Matchers<R> extends CustomMatchers<R> {}
	interface AsyncAsymmetricMatchers extends CustomMatchers {}
}

declare interface JestMatchers<T> extends CustomMatchers<T> {}
