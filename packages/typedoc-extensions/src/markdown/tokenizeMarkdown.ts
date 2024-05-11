export enum MarkdownTokenType {
	CodeDelim,
	MathDelim,
	Text,
	Space,
}

export interface MarkdownToken {
	type: MarkdownTokenType;
	text: string;
	position: number;
}

const tokenizeMarkdown = (markdown: string) => {
	const result: MarkdownToken[] = [];

	let escaped = false;
	let tokenStartIndex = 0;
	let buffer: string[] = [];
	let currentType = MarkdownTokenType.Text;

	const flushToken = () => {
		if (buffer.length === 0) {
			return;
		}

		const text = buffer.join('');

		result.push({
			type: currentType,
			text,
			position: tokenStartIndex,
		});
		buffer = [];
		tokenStartIndex += text.length;
	};

	const extendToken = (expectedType: MarkdownTokenType, text: string) => {
		if (currentType !== expectedType) {
			flushToken();
			currentType = expectedType;
		}

		buffer.push(text);
	};

	for (const char of markdown) {
		let handled = false;
		if (!escaped) {
			if (char === '`') {
				// code
				extendToken(MarkdownTokenType.CodeDelim, char);

				handled = true;
			} else if (char === '$') {
				// math
				extendToken(MarkdownTokenType.MathDelim, char);

				if (buffer.length > 2) {
					flushToken();
				}

				handled = true;
			} else if (char === '\\') {
				// escape
				escaped = true;

				// Not added to its own token
				handled = false;
			}
		}
		escaped = false;

		if (!handled) {
			if (/\s+/.exec(char)) {
				extendToken(MarkdownTokenType.Space, char);
			} else {
				extendToken(MarkdownTokenType.Text, char);
			}
		}
	}

	flushToken();

	return result;
};

export default tokenizeMarkdown;
