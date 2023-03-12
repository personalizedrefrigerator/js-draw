import RenderingStyle, { cloneStyle, styleFromJSON, styleToJSON } from './RenderingStyle';

export interface TextRenderingStyle {
	readonly size: number;
	readonly fontFamily: string;
	readonly fontWeight?: string;
	readonly fontVariant?: string;
	readonly renderingStyle: RenderingStyle;
}

export default TextRenderingStyle;

export const cloneTextStyle = (style: TextRenderingStyle) => {
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

	const style: TextRenderingStyle = {
		renderingStyle: styleFromJSON(json.renderingStyle),
		size: json.size,
		fontWeight: json.fontWeight,
		fontVariant: json.fontVariant,
		fontFamily: json.fontFamily,
	};

	return style;
};

export const textStyleToJSON = (style: TextRenderingStyle) => {
	return {
		...style,
		renderingStyle: styleToJSON(style.renderingStyle),
	};
};