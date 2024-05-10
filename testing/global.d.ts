

// Type declarations for custom matchers
interface CustomMatchers<R = unknown> {
	objEq(expected: {
		eq: (other: any, ...args: any)=> boolean;
	}, ...opts: any): R;

	toHaveEntriesCloseTo(expected: number[], tolerance?: number): R;
}

declare namespace jest {
	interface Expect extends CustomMatchers {}
	interface Matchers<R> extends CustomMatchers<R> {}
	interface AsyncAsymmetricMatchers extends CustomMatchers {}
}

declare interface JestMatchers<T> extends CustomMatchers<T> {
}
