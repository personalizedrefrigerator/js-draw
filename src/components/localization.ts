export interface ImageComponentLocalization {
	unlabeledImageNode: string;
	text: (text: string)=> string;
	imageNode: (description: string)=> string;
	stroke: string;
    svgObject: string;
}

export const defaultComponentLocalization: ImageComponentLocalization = {
	unlabeledImageNode: 'Unlabeled image node',
	stroke: 'Stroke',
	svgObject: 'SVG Object',
	text: (text) => `Text object: ${text}`,
	imageNode: (description: string) => `Image: ${description}`,
};
