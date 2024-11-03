import parseMarkdown, { RegionType } from './parseMarkdown';

describe('parseMarkdown', () => {
	it('should parse inline code', () => {
		expect(parseMarkdown('`a test`')).toMatchObject([
			{
				type: RegionType.Code,
				block: false,
				content: 'a test',
				fullText: '`a test`',
				start: 0,
				stop: 8,
			},
		]);

		expect(parseMarkdown('another `test`')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'another ',
				fullText: 'another ',
				start: 0,
				stop: 8,
			},
			{
				type: RegionType.Code,
				block: false,
				content: 'test',
				fullText: '`test`',
				start: 8,
				stop: 14,
			},
		]);

		expect(parseMarkdown('another `te\nst`')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'another `te\nst`',
				fullText: 'another `te\nst`',
				start: 0,
				stop: 15,
			},
		]);

		expect(parseMarkdown('another `te\nst`...')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'another `te\nst`...',
				fullText: 'another `te\nst`...',
				start: 0,
				stop: 18,
			},
		]);

		expect(parseMarkdown('Yet another ``test``...')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'Yet another ',
				fullText: 'Yet another ',
				start: 0,
				stop: 12,
			},
			{
				type: RegionType.Code,
				block: false,
				content: 'test',
				fullText: '``test``',
				start: 12,
				stop: 20,
			},
			{
				type: RegionType.Text,
				block: false,
				content: '...',
				fullText: '...',
				start: 20,
				stop: 23,
			},
		]);

		expect(
			parseMarkdown('A multiline\ntest with `inline`\n``co`de``... ``:)``\n\na`a\n`$4+4$`'),
		).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'A multiline\ntest with ',
				fullText: 'A multiline\ntest with ',
				start: 0,
				stop: 22,
			},
			{
				type: RegionType.Code,
				block: false,
				content: 'inline',
				fullText: '`inline`',
				start: 22,
				stop: 30,
			},
			{
				type: RegionType.Text,
				block: false,
				content: '\n',
				fullText: '\n',
				start: 30,
				stop: 31,
			},
			{
				type: RegionType.Code,
				block: false,
				content: 'co`de',
				fullText: '``co`de``',
				start: 31,
				stop: 40,
			},
			{
				type: RegionType.Text,
				block: false,
				content: '... ',
				fullText: '... ',
				start: 40,
				stop: 44,
			},
			{
				type: RegionType.Code,
				block: false,
				content: ':)',
				fullText: '``:)``',
				start: 44,
				stop: 50,
			},
			{
				type: RegionType.Text,
				block: false,
				content: '\n\na`a\n',
				fullText: '\n\na`a\n',
				start: 50,
				stop: 56,
			},
			{
				type: RegionType.Code,
				block: false,
				content: '$4+4$',
				fullText: '`$4+4$`',
				start: 56,
				stop: 63,
			},
		]);
	});

	it('should parse inline math', () => {
		expect(parseMarkdown('$a test$')).toMatchObject([
			{
				type: RegionType.Math,
				block: false,
				content: 'a test',
				fullText: '$a test$',
				start: 0,
				stop: 8,
			},
		]);

		expect(parseMarkdown('some $\\TeX$')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'some ',
				fullText: 'some ',
				start: 0,
				stop: 5,
			},
			{
				type: RegionType.Math,
				block: false,
				content: '\\TeX',
				fullText: '$\\TeX$',
				start: 5,
				stop: 11,
			},
		]);

		expect(parseMarkdown('another $te\nst$')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'another $te\nst$',
				fullText: 'another $te\nst$',
				start: 0,
				stop: 15,
			},
		]);

		expect(parseMarkdown('Not $ math $')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'Not $ math $',
				fullText: 'Not $ math $',
				start: 0,
				stop: 12,
			},
		]);

		expect(parseMarkdown('Not $$ math $$')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'Not $$ math $$',
				fullText: 'Not $$ math $$',
				start: 0,
				stop: 14,
			},
		]);

		expect(parseMarkdown('Sum $x$ and $\\int_0^1 y^2 dy$. 3$.')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'Sum ',
				fullText: 'Sum ',
				start: 0,
				stop: 4,
			},
			{
				type: RegionType.Math,
				block: false,
				content: 'x',
				fullText: '$x$',
				start: 4,
				stop: 7,
			},
			{
				type: RegionType.Text,
				block: false,
				content: ' and ',
				fullText: ' and ',
				start: 7,
				stop: 12,
			},
			{
				type: RegionType.Math,
				block: false,
				content: '\\int_0^1 y^2 dy',
				fullText: '$\\int_0^1 y^2 dy$',
				start: 12,
				stop: 29,
			},
			{
				type: RegionType.Text,
				block: false,
				content: '. 3$.',
				fullText: '. 3$.',
				start: 29,
				stop: 34,
			},
		]);
	});

	it('should parse block math', () => {
		expect(parseMarkdown('some\n$$ \\TeX $$')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'some\n',
				fullText: 'some\n',
				start: 0,
				stop: 5,
			},
			{
				type: RegionType.Math,
				block: true,
				content: ' \\TeX ',
				fullText: '$$ \\TeX $$',
				start: 5,
				stop: 15,
			},
		]);

		expect(parseMarkdown('some \n$$\n \\text{multiline} \n \\TeX\n$$')).toMatchObject([
			{
				type: RegionType.Text,
				block: false,
				content: 'some \n',
				fullText: 'some \n',
				start: 0,
				stop: 6,
			},
			{
				type: RegionType.Math,
				block: true,
				content: '\n \\text{multiline} \n \\TeX\n',
				fullText: '$$\n \\text{multiline} \n \\TeX\n$$',
				start: 6,
				stop: 36,
			},
		]);
	});

	it('should parse include directives', () => {
		expect(parseMarkdown('testing [[include:path/to/a/file.md]]')).toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "testing ",
    "fullText": "testing ",
    "start": 0,
    "stop": 8,
    "type": "text",
  },
  {
    "block": false,
    "content": "path/to/a/file.md",
    "fullText": "[[include:path/to/a/file.md]]",
    "start": 8,
    "stop": 37,
    "type": "include",
  },
]
`);
		// Should support including based on paths
		expect(parseMarkdown('[[include:path/to/another/file.md]]')).toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "path/to/another/file.md",
    "fullText": "[[include:path/to/another/file.md]]",
    "start": 0,
    "stop": 35,
    "type": "include",
  },
]
`);
		// Includes cannot contain newlines.
		expect(parseMarkdown('[[include:path\n/to/another/file.md]]')).toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "[[include:path
/to/another/file.md]]",
    "fullText": "[[include:path
/to/another/file.md]]",
    "start": 0,
    "stop": 36,
    "type": "text",
  },
]
`);
		// Includes need an ending delimiter, and are otherwise marked as text:
		expect(parseMarkdown('[[include:')).toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "[[include:",
    "fullText": "[[include:",
    "start": 0,
    "stop": 10,
    "type": "text",
  },
]
`);
		// Not all text in [[brackets]] should be marked as an include.
		expect(parseMarkdown('[[include:path/to/another/file.md]]. Test. [[test]]. [[Include:TEST]]'))
			.toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "path/to/another/file.md",
    "fullText": "[[include:path/to/another/file.md]]",
    "start": 0,
    "stop": 35,
    "type": "include",
  },
  {
    "block": false,
    "content": ". Test. [[test]]. [[Include:TEST]]",
    "fullText": ". Test. [[test]]. [[Include:TEST]]",
    "start": 35,
    "stop": 69,
    "type": "text",
  },
]
`);
		// Should support [[brackets] within an include, so long as these brackets aren't the
		// ending delimiter. Should also support multiple includes.
		expect(
			parseMarkdown(
				'[[include:[[path/to/another/file].md]]]]. Test.\n [[include:test]] [[include:',
			),
		).toMatchInlineSnapshot(`
[
  {
    "block": false,
    "content": "[[path/to/another/file].md",
    "fullText": "[[include:[[path/to/another/file].md]]",
    "start": 0,
    "stop": 38,
    "type": "include",
  },
  {
    "block": false,
    "content": "]]. Test.
 ",
    "fullText": "]]. Test.
 ",
    "start": 38,
    "stop": 49,
    "type": "text",
  },
  {
    "block": false,
    "content": "test",
    "fullText": "[[include:test]]",
    "start": 49,
    "stop": 65,
    "type": "include",
  },
  {
    "block": false,
    "content": " [[include:",
    "fullText": " [[include:",
    "start": 65,
    "stop": 76,
    "type": "text",
  },
]
`);
	});
});
