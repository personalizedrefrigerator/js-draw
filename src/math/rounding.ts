// Clean up stringified numbers
const cleanUpNumber = (text: string) => {
	// Remove trailing zeroes
	text = text.replace(/([.]\d*[^0]+)0+$/, '$1');
	text = text.replace(/[.]0+$/, '.');

	// Remove trailing period
	text = text.replace(/[.]$/, '');

	if (text === '-0') {
		return '0';
	}
	return text;
};

export const toRoundedString = (num: number): string => {
	// Try to remove rounding errors. If the number ends in at least three/four zeroes
	// (or nines) just one or two digits, it's probably a rounding error.
	const fixRoundingUpExp = /^([-]?\d*\.\d{3,})0{4,}\d{1,2}$/;
	const hasRoundingDownExp = /^([-]?)(\d*)\.(\d{3,}9{4,})\d{1,2}$/;

	let text = num.toString();
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
const getLenAfterDecimal = (numberAsString: string) => {
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
				postDecimal = (parseInt(postDecimal) + 1).toString();
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
