export interface ImageComponentLocalization {
	unlabeledImageNode: string;
	text: (text: string)=> string;
	imageNode: (description: string)=> string;
	stroke: string;
    svgObject: string;
	emptyBackground: string;
	filledBackgroundWithColor: (color: string)=> string;

	restyledElements: string;
}

export const defaultComponentLocalization: ImageComponentLocalization = {
	unlabeledImageNode: 'Unlabeled image node',
	stroke: 'Stroke',
	svgObject: 'SVG Object',
	restyledElements: 'Restyled elements',
	emptyBackground: 'Empty background',
	filledBackgroundWithColor: (color) => `Filled background (${color})`,
	text: (text) => `Text object: ${text}`,
	imageNode: (description: string) => `Image: ${description}`,
};
