
import katex from 'katex';
import parseMarkdown, { RegionType } from './markdown/parseMarkdown';
import htmlEscape from './markdown/htmlEscape';

interface Callbacks {
	addDoctest(testData: string): void;
}

const transformMarkdown = (markdown: string, callbacks: Callbacks) => {
	// No need for a tree -- a flat list is sufficient.
	const nodes = parseMarkdown(markdown);
	const transformedMarkdown = [];

	const runnableExp = /^(ts|js|css),runnable(,console)?/;

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

			const mode = (runnableMatch[2] ?? ',html').substring(1);

			const makeRunnableContainer = (doctest: boolean) => `<pre 
				class="runnable-code"
				data--lang="${htmlEscape(runnableMatch[1] ?? '')}"
				data--mode="${htmlEscape(mode)}"
				data--doctest="${doctest ? 'true' : 'false'}"
				spellcheck="false"
			>${
	htmlEscape(content)
}</pre>`;

			transformedMarkdown.push(makeRunnableContainer(false));
			callbacks.addDoctest(makeRunnableContainer(true));
		} else {
			transformedMarkdown.push(node.fullText);
		}
	}

	return transformedMarkdown.join('');
};

export default transformMarkdown;
