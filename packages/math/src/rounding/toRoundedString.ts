import cleanUpNumber from './cleanUpNumber';

/**
 * Converts `num` to a string, removing trailing digits that were likely caused by
 * precision errors.
 *
 * @example
 * ```ts,runnable,console
 * import { toRoundedString } from '@js-draw/math';
 *
 * console.log('Rounded: ', toRoundedString(1.000000011));
 * ```
 */
export const toRoundedString = (num: number): string => {
	// Try to remove rounding errors. If the number ends in at least three/four zeroes
	// (or nines) just one or two digits, it's probably a rounding error.
	const fixRoundingUpExp = /^([-]?\d*\.\d{3,})0{4,}\d{1,4}$/;
	const hasRoundingDownExp = /^([-]?)(\d*)\.(\d{3,}9{4,})\d{1,4}$/;

	let text = num.toString(10);
	if (text.indexOf('.') === -1) {
		return text;
	}

	const roundingDownMatch = hasRoundingDownExp.exec(text);
	if (roundingDownMatch) {
		const negativeSign = roundingDownMatch[1];
		const postDecimalString = roundingDownMatch[3];
		const lastDigit = parseInt(postDecimalString.charAt(postDecimalString.length - 1), 10);
		const postDecimal = parseInt(postDecimalString, 10);
		const preDecimal = parseInt(roundingDownMatch[2], 10);

		const origPostDecimalString = roundingDownMatch[3];

		let newPostDecimal = (postDecimal + 10 - lastDigit).toString();
		let carry = 0;
		if (newPostDecimal.length > postDecimal.toString().length) {
			// Left-shift
			newPostDecimal = newPostDecimal.substring(1);
			carry = 1;
		}

		// parseInt(...).toString() removes leading zeroes. Add them back.
		while (newPostDecimal.length < origPostDecimalString.length) {
			newPostDecimal = carry.toString(10) + newPostDecimal;
			carry = 0;
		}

		text = `${negativeSign + (preDecimal + carry).toString()}.${newPostDecimal}`;
	}

	text = text.replace(fixRoundingUpExp, '$1');

	return cleanUpNumber(text);
};

export default toRoundedString;
