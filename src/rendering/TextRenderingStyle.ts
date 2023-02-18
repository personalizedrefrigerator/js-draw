import RenderingStyle, { cloneStyle, styleFromJSON, styleToJSON } from './RenderingStyle';

export interface TextStyle {
	size: number;
	fontFamily: string;
	fontWeight?: string;
	fontVariant?: string;
	renderingStyle: RenderingStyle;
}

export default TextStyle;

export const cloneTextStyle = (style: TextStyle) => {
	return {
		...style,
		renderingStyle: cloneStyle(style.renderingStyle),
	};
};

export const textStyleFromJSON = (json: any) => {
	if (typeof json === 'string') {
		json = JSON.parse(json);
	}

	if (typeof(json.fontFamily) !== 'string') {
		throw new Error('Serialized textStyle missing string fontFamily attribute!');
	}

	const style: TextStyle = {
		renderingStyle: styleFromJSON(json.renderingStyle),
		size: json.size,
		fontWeight: json.fontWeight,
		fontVariant: json.fontVariant,
		fontFamily: json.fontFamily,
	};

	return style;
};

export const textStyleToJSON = (style: TextStyle) => {
	return {
		...style,
		renderingStyle: styleToJSON(style.renderingStyle),
	};
};