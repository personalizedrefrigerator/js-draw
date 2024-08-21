import tokenizeMarkdown, { MarkdownTokenType } from './tokenizeMarkdown';

describe('tokenizeMarkdown', () => {
	it('should tokenize inline code delimiters', () => {
		expect(tokenizeMarkdown('Test, `code`')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Test,' },
			{ type: MarkdownTokenType.Space, position: 5, text: ' ' },
			{ type: MarkdownTokenType.CodeDelim, position: 6, text: '`' },
			{ type: MarkdownTokenType.Text, position: 7, text: 'code' },
			{ type: MarkdownTokenType.CodeDelim, position: 11, text: '`' },
		]);


		expect(tokenizeMarkdown('`code ✅ `` ... ``` a \n`b')).toMatchObject([
			{ type: MarkdownTokenType.CodeDelim, position: 0, text: '`' },
			{ type: MarkdownTokenType.Text, position: 1, text: 'code' },
			{ type: MarkdownTokenType.Space, position: 5, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 6, text: '✅' },
			{ type: MarkdownTokenType.Space, position: 7, text: ' ' },
			{ type: MarkdownTokenType.CodeDelim, position: 8, text: '``' },
			{ type: MarkdownTokenType.Space, position: 10, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 11, text: '...' },
			{ type: MarkdownTokenType.Space, position: 14, text: ' ' },
			{ type: MarkdownTokenType.CodeDelim, position: 15, text: '```' },
			{ type: MarkdownTokenType.Space, position: 18, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 19, text: 'a' },
			{ type: MarkdownTokenType.Space, position: 20, text: ' \n' },
			{ type: MarkdownTokenType.CodeDelim, position: 22, text: '`' },
			{ type: MarkdownTokenType.Text, position: 23, text: 'b' },
		]);

		expect(tokenizeMarkdown('Yet another ``test``...')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Yet' },
			{ type: MarkdownTokenType.Space, position: 3, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 4, text: 'another' },
			{ type: MarkdownTokenType.Space, position: 11, text: ' ' },
			{ type: MarkdownTokenType.CodeDelim, position: 12, text: '``' },
			{ type: MarkdownTokenType.Text, position: 14, text: 'test' },
			{ type: MarkdownTokenType.CodeDelim, position: 18, text: '``' },
			{ type: MarkdownTokenType.Text, position: 20, text: '...' },

		]);
	});

	it('should tokenize inline math delimiters', () => {
		expect(tokenizeMarkdown('Test, $\\TeX$')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Test,' },
			{ type: MarkdownTokenType.Space, position: 5, text: ' ' },
			{ type: MarkdownTokenType.MathDelim, position: 6, text: '$' },
			{ type: MarkdownTokenType.Text, position: 7, text: '\\TeX' },
			{ type: MarkdownTokenType.MathDelim, position: 11, text: '$' },
		]);

		expect(tokenizeMarkdown('Test, $$\\TeX^2 + 3$$.')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Test,' },
			{ type: MarkdownTokenType.Space, position: 5, text: ' ' },
			{ type: MarkdownTokenType.MathDelim, position: 6, text: '$$' },
			{ type: MarkdownTokenType.Text, position: 8, text: '\\TeX^2' },
			{ type: MarkdownTokenType.Space, position: 14, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 15, text: '+' },
			{ type: MarkdownTokenType.Space, position: 16, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 17, text: '3' },
			{ type: MarkdownTokenType.MathDelim, position: 18, text: '$$' },
			{ type: MarkdownTokenType.Text, position: 20, text: '.' },
		]);
	});

	it('should tokenize include delimiters', () => {
		expect(tokenizeMarkdown('Test, [[foo]].')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Test,' },
			{ type: MarkdownTokenType.Space, position: 5, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 6, text: '[[foo' },
			{ type: MarkdownTokenType.IncludeEndDelim, position: 11, text: ']]' },
			{ type: MarkdownTokenType.Text, position: 13, text: '.' },
		]);
		expect(tokenizeMarkdown('Another test: [[include:foo/bar/baz]].')).toMatchObject([
			{ type: MarkdownTokenType.Text, position: 0, text: 'Another' },
			{ type: MarkdownTokenType.Space, position: 7, text: ' ' },
			{ type: MarkdownTokenType.Text, position: 8, text: 'test:' },
			{ type: MarkdownTokenType.Space, position: 13, text: ' ' },
			{ type: MarkdownTokenType.IncludeStartDelim, position: 14, text: '[[include:' },
			{ type: MarkdownTokenType.Text, position: 24, text: 'foo/bar/baz' },
			{ type: MarkdownTokenType.IncludeEndDelim, position: 35, text: ']]' },
			{ type: MarkdownTokenType.Text, position: 37, text: '.' },
		]);
	});
});
