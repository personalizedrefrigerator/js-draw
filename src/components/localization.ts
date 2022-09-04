export interface ImageComponentLocalization {
	text: (text: string)=> string;
	stroke: string;
    svgObject: string;
}

export const defaultComponentLocalization: ImageComponentLocalization = {
	stroke: 'Stroke',
	svgObject: 'SVG Object',
	text: (text) => `Text object: ${text}`,
};
