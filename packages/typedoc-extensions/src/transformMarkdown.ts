
import katex from 'katex';
import parseMarkdown, { RegionType } from './markdown/parseMarkdown';
import htmlEscape from './markdown/htmlEscape';

const transformMarkdown = (markdown: string) => {
	// No need for a tree -- a flat list is sufficient.
	const nodes = parseMarkdown(markdown);
	const transformedMarkdown = [];

	const runnableExp = /^(ts|js),runnable/;

	for (const node of nodes) {
		if (node.type === RegionType.Math) {
			const tex = node.content;
			transformedMarkdown.push(
				katex.renderToString(tex, {
					displayMode: node.block,
				}),
			);
		} else if (node.type === RegionType.Code && node.block && node.content.match(runnableExp)) {
			const runnableMatch = runnableExp.exec(node.content)!;
			const content = node.content.substring(runnableMatch[0].length);

			transformedMarkdown.push(
				`<textarea 
					class="runnable-code"
					data--mode="${runnableMatch[1]}"
					spellcheck="false"
				>${
	htmlEscape(content)
}</textarea>`
			);
		} else {
			transformedMarkdown.push(node.fullText);
		}
	}

	return transformedMarkdown.join('');
};

export default transformMarkdown;
