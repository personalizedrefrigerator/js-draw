import { numberRegex } from './constants';

/**
 * Returns the length of `numberAsString` after a decimal point.
 *
 * For example,
 * ```ts
 * getLenAfterDecimal('1.001') // -> 3
 * ```
 */
export const getLenAfterDecimal = (numberAsString: string) => {
	const numberMatch = numberRegex.exec(numberAsString);
	if (!numberMatch) {
		// If not a match, either the number is exponential notation (or is something
		// like NaN or Infinity)
		if (numberAsString.search(/[eE]/) !== -1 || /^[a-zA-Z]+$/.exec(numberAsString)) {
			return -1;
			// Or it has no decimal point
		} else {
			return 0;
		}
	}

	const afterDecimalLen = numberMatch[3].length;
	return afterDecimalLen;
};

export default getLenAfterDecimal;
