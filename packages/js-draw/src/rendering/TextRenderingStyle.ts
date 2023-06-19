import RenderingStyle, { cloneStyle, styleFromJSON, styleToJSON } from './RenderingStyle';

export interface TextRenderingStyle {
	readonly size: number;

	/** Name of the font. */
	readonly fontFamily: string;

	/** For example, `bold`. Like CSS `font-weight`. */
	readonly fontWeight?: string;

	/** For example, `italic`. Like CSS `font-style`. */
	readonly fontStyle?: string;

	readonly fontVariant?: string;

	/** Fill and stroke of the text. */
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