export interface ImageComponentLocalization {
	unlabeledImageNode: string;
	text: (text: string)=> string;
	imageNode: (description: string)=> string;
	stroke: string;
    svgObject: string;

	setColor: (newColorString: string)=> string;
}

export const defaultComponentLocalization: ImageComponentLocalization = {
	unlabeledImageNode: 'Unlabeled image node',
	stroke: 'Stroke',
	svgObject: 'SVG Object',
	text: (text) => `Text object: ${text}`,
	imageNode: (description: string) => `Image: ${description}`,

	setColor: (newColorString: string) => `Set node color to ${newColorString}`,
};
