
/**
 * Compile-time assertion that a branch of code is unreachable.
 * @internal
 */
export const assertUnreachable = (key: never): never => {
	// See https://stackoverflow.com/a/39419171/17055750
	throw new Error(`Should be unreachable. Key: ${key}.`);
};


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
 *
 *
 */
export const assertIsNumber = (value: any, allowNaN: boolean = false): value is number => {
	if (typeof value !== 'number' || (!allowNaN && isNaN(value))) {
		throw new Error('Given value is not a number');
		// return false;
	}

	return true;
};

/**
 * Throws if any of `values` is not of type number.
 */
export const assertIsNumberArray = (
	values: any[], allowNaN: boolean = false
): values is number[] => {
	if (typeof values !== 'object') {
		throw new Error('Asserting isNumberArray: Given entity is not an array');
	}

	if (!assertIsNumber(values['length'])) {
		return false;
	}

	for (const value of values) {
		if (!assertIsNumber(value, allowNaN)) {
			return false;
		}
	}

	return true;
};