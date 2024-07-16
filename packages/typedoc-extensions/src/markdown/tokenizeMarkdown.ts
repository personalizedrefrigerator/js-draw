

export enum MarkdownTokenType {
	CodeDelim,
	MathDelim,
	IncludeStartDelim,
	IncludeEndDelim,
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

	for (let i = 0; i < markdown.length; i ++) {
		const char = markdown.charAt(i);
		let handled = false;

		const matches = (text: string) => markdown.substring(i, i + text.length) === text;
		const eatIfMatching = (text: string, tokenType: MarkdownTokenType) => {
			if (matches(text)) {
				i += text.length - 1;
				extendToken(tokenType, text);
				flushToken();
				return true;
			}
			return false;
		};

		if (!escaped) {
			if (char === '`') {
				// code
				extendToken(MarkdownTokenType.CodeDelim, char);

				handled = true;
			}
			else if (char === '$') {
				// math
				extendToken(MarkdownTokenType.MathDelim, char);

				if (buffer.length > 2) {
					flushToken();
				}

				handled = true;
			}
			else if (matches('[[include:') || matches(']]')) {
				// include
				handled = (
					eatIfMatching('[[include:', MarkdownTokenType.IncludeStartDelim) || eatIfMatching(']]', MarkdownTokenType.IncludeEndDelim)
				);
			}
			else if (char === '\\') {
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
