// @packageDocumentation @internal

// Clean up stringified numbers
export const cleanUpNumber = (text: string) => {
	// Regular expression substitions can be somewhat expensive. Only do them
	// if necessary.

	if (text.indexOf('e') > 0) {
		// Round to zero.
		if (text.match(/[eE][-]\d{2,}$/)) {
			return '0';
		}
	}

	const lastChar = text.charAt(text.length - 1);
	if (lastChar === '0' || lastChar === '.') {
		// Remove trailing zeroes
		text = text.replace(/([.]\d*[^0]+)0+$/, '$1');
		text = text.replace(/[.]0+$/, '.');

		// Remove trailing period
		text = text.replace(/[.]$/, '');
	}

	const firstChar = text.charAt(0);
	if (firstChar === '0' || firstChar === '-') {
		// Remove unnecessary leading zeroes.
		text = text.replace(/^(0+)[.]/, '.');
		text = text.replace(/^-(0+)[.]/, '-.');
		text = text.replace(/^(-?)0+$/, '$10');
	}

	if (text === '-0') {
		return '0';
	}

	return text;
};

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

const numberExp = /^([-]?)(\d*)[.](\d+)$/;
export const getLenAfterDecimal = (numberAsString: string) => {
	const numberMatch = numberExp.exec(numberAsString);
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

// [reference] should be a string representation of a base-10 number (no exponential (e.g. 10e10))
export const toStringOfSamePrecision = (num: number, ...references: string[]): string => {
	const text = num.toString(10);
	const textMatch = numberExp.exec(text);
	if (!textMatch) {
		return text;
	}

	let decimalPlaces = -1;
	for (const reference of references) {
		decimalPlaces = Math.max(getLenAfterDecimal(reference), decimalPlaces);
	}

	if (decimalPlaces === -1) {
		return toRoundedString(num);
	}

	// Make text's after decimal length match [afterDecimalLen].
	let postDecimal = textMatch[3].substring(0, decimalPlaces);
	let preDecimal = textMatch[2];
	const nextDigit = textMatch[3].charAt(decimalPlaces);

	if (nextDigit !== '') {
		const asNumber = parseInt(nextDigit, 10);
		if (asNumber >= 5) {
			// Don't attempt to parseInt() an empty string.
			if (postDecimal.length > 0) {
				const leadingZeroMatch = /^(0+)(\d*)$/.exec(postDecimal);

				let leadingZeroes = '';
				let postLeading = postDecimal;
				if (leadingZeroMatch) {
					leadingZeroes = leadingZeroMatch[1];
					postLeading = leadingZeroMatch[2];
				}

				postDecimal = (parseInt(postDecimal) + 1).toString();

				// If postDecimal got longer, remove leading zeroes if possible
				if (postDecimal.length > postLeading.length && leadingZeroes.length > 0) {
					leadingZeroes = leadingZeroes.substring(1);
				}

				postDecimal = leadingZeroes + postDecimal;
			}

			if (postDecimal.length === 0 || postDecimal.length > decimalPlaces) {
				preDecimal = (parseInt(preDecimal) + 1).toString();
				postDecimal = postDecimal.substring(1);
			}
		}
	}

	const negativeSign = textMatch[1];
	return cleanUpNumber(`${negativeSign}${preDecimal}.${postDecimal}`);
};

