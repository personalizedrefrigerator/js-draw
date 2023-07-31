
import katex from 'katex';
import parseMarkdown, { RegionType } from './markdown/parseMarkdown';

const transformMarkdown = (markdown: string) => {
	// No need for a tree -- a flat list is sufficient.
	const nodes = parseMarkdown(markdown);
	const transformedMarkdown = [];

	for (const node of nodes) {
		if (node.type === RegionType.Math) {
			const tex = node.content;
			transformedMarkdown.push(
				katex.renderToString(tex, {
					displayMode: node.block,
				}),
			);
		} else {
			transformedMarkdown.push(node.fullText);
		}
	}

	return transformedMarkdown.join('');
};

export default transformMarkdown;
