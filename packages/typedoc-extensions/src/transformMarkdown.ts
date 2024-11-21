import katex from 'katex';
import parseMarkdown, { RegionType } from './markdown/parseMarkdown';
import htmlEscape from './markdown/htmlEscape';
import * as fs from 'node:fs';

interface Callbacks {
	addDoctest(testData: string): void;
	resolveIncludePath(path: string): string | null;
}

const transformMarkdown = (markdown: string, callbacks: Callbacks): string => {
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
			>${htmlEscape(content)}</pre>`;

			transformedMarkdown.push(makeRunnableContainer(false));
			callbacks.addDoctest(makeRunnableContainer(true));
		} else if (node.type === RegionType.Include) {
			const targetPath = callbacks.resolveIncludePath(node.content);
			if (!targetPath) {
				throw new Error(
					`Invalid include: ${node.content}. Is it a path within the project's includeBaseDirectory?\nContext: Processing ${markdown}`,
				);
			}

			if (!fs.statSync(targetPath).isFile()) {
				throw new Error(
					`Cannot include non-file at path ${targetPath}. While processing: ${markdown}`,
				);
			}

			const content = fs.readFileSync(targetPath, 'utf-8');
			transformedMarkdown.push(transformMarkdown(content, callbacks));
		} else {
			transformedMarkdown.push(node.fullText);
		}
	}

	return transformedMarkdown.join('');
};

export default transformMarkdown;
