
export interface TextRendererLocalization {
    textNode(content: string): string;
    rerenderAsText: string;
}

export const defaultTextRendererLocalization: TextRendererLocalization = {
	textNode: (content: string) => `Text: ${content}`,
	rerenderAsText: 'Re-render as text',
};