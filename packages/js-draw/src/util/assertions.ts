// Note: Arrow functions cannot be used for type assertions. See
// https://github.com/microsoft/TypeScript/issues/34523

/**
 * Compile-time assertion that a branch of code is unreachable.
 * @internal
 */
export function assertUnreachable(key: never): never {
	// See https://stackoverflow.com/a/39419171/17055750
	throw new Error(`Should be unreachable. Key: ${key}.`);
}

/**
 * Throws an exception if the typeof given value is not a number or `value` is NaN.
 *
 * @example
 * ```ts
 * const foo: unknown = 3;
 * assertIsNumber(foo);
 *
 * assertIsNumber('hello, world'); // throws an Error.
 * ```
 */
export function assertIsNumber(value: unknown, allowNaN: boolean = false): asserts value is number {
	if (typeof value !== 'number' || (!allowNaN && isNaN(value))) {
		throw new Error('Given value is not a number');
	}
}

export function assertIsArray(values: unknown): asserts values is unknown[] {
	if (!Array.isArray(values)) {
		throw new Error('Asserting isArray: Given entity is not an array');
	}
}

/**
 * Throws if any of `values` is not of type number.
 */
export function assertIsNumberArray(
	values: unknown,
	allowNaN: boolean = false,
): asserts values is number[] {
	assertIsArray(values);
	assertIsNumber(values.length);

	for (const value of values) {
		assertIsNumber(value, allowNaN);
	}
}

/**
 * Throws an exception if `typeof value` is not a boolean.
 */
export function assertIsBoolean(value: unknown): asserts value is boolean {
	if (typeof value !== 'boolean') {
		throw new Error('Given value is not a boolean');
	}
}

export function assertTruthy<T>(value: T | null | undefined | false | 0): asserts value is T {
	if (!value) {
		throw new Error(`${JSON.stringify(value)} is not truthy`);
	}
}

export function assertIsObject(value: unknown): asserts value is Record<string, unknown> {
	if (typeof value !== 'object') {
		throw new Error(`AssertIsObject: Given entity is not an object (type = ${typeof value})`);
	}
}
