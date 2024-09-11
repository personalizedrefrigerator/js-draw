import cleanUpNumber from './cleanUpNumber';
import { numberRegex } from './constants';
import getLenAfterDecimal from './getLenAfterDecimal';
import toRoundedString from './toRoundedString';

// [reference] should be a string representation of a base-10 number (no exponential (e.g. 10e10))
export const toStringOfSamePrecision = (num: number, ...references: string[]): string => {
	const text = num.toString(10);
	const textMatch = numberRegex.exec(text);
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

export default toStringOfSamePrecision;
