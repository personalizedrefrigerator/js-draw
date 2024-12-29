/** Cleans up stringified numbers */
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
		text = text.replace(/([.]\d*[^0])0+$/, '$1');
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

export default cleanUpNumber;
