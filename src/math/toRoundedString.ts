export const toRoundedString = (num: number): string => {
	// Try to remove rounding errors. If the number ends in at least three/four zeroes
	// (or nines) just one or two digits, it's probably a rounding error.
	const fixRoundingUpExp = /^([-]?\d*\.\d{3,})0{4,}\d+$/;
	const hasRoundingDownExp = /^([-]?)(\d*)\.(\d{3,}9{4,})\d+$/;

	let text = num.toString();
	do {
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

		// Remove trailing zeroes
		text = text.replace(/([.]\d*[^0]+)0+$/, '$1');
		text = text.replace(/[.]0+$/, '.');
	}
	while (fixRoundingUpExp.exec(text) || hasRoundingDownExp.exec(text));

	// Remove trailing period
	return text.replace(/[.]$/, '');
};