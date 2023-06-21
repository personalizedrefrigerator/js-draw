
export interface TextRendererLocalization {
	pathNodeCount(pathCount: number): string;
	textNodeCount(nodeCount: number): string;
	imageNodeCount(nodeCount: number): string;
	textNode(content: string): string;
	unlabeledImageNode: string;
	imageNode(label: string): string;
	rerenderAsText: string;
}

export const defaultTextRendererLocalization: TextRendererLocalization = {
	pathNodeCount: (count: number) => `There are ${count} visible path objects.`,
	textNodeCount: (count: number) => `There are ${count} visible text nodes.`,
	imageNodeCount: (nodeCount: number) => `There are ${nodeCount} visible image nodes.`,
	textNode: (content: string) => `Text: ${content}`,
	imageNode: (label: string) => `Image: ${label}`,
	unlabeledImageNode: 'Unlabeled image',
	rerenderAsText: 'Re-render as text',
};