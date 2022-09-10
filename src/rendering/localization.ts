
export interface TextRendererLocalization {
	pathNodeCount(pathCount: number): string;
	textNodeCount(nodeCount: number): string;
    textNode(content: string): string;
    rerenderAsText: string;
}

export const defaultTextRendererLocalization: TextRendererLocalization = {
	pathNodeCount: (count: number) => `There are ${count} visible path objects.`,
	textNodeCount: (count: number) => `There are ${count} visible text nodes.`,
	textNode: (content: string) => `Text: ${content}`,
	rerenderAsText: 'Re-render as text',
};