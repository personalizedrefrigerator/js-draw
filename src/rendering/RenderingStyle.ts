import Color4 from '../Color4';

interface RenderingStyle {
	fill: Color4;
	stroke?: {
		color: Color4;
		width: number;
	};
}

export default RenderingStyle;

export const stylesEqual = (a: RenderingStyle, b: RenderingStyle): boolean => {
	const result = a === b || (a.fill.eq(b.fill)
		&& (a.stroke == undefined) === (b.stroke == undefined)
        && (a.stroke?.color?.eq(b.stroke?.color) ?? true)
		&& a.stroke?.width === b.stroke?.width);
    
	// Map undefined/null -> false
	return result ?? false;
};

// Returns an object that can be converted to a JSON string with
// JSON.stringify.
export const styleToJSON = (style: RenderingStyle) => {
	const stroke = !style.stroke ? undefined : {
		color: style.stroke.color.toHexString(),
		width: style.stroke.width,
	};

	return {
		fill: style.fill.toHexString(),
		stroke,
	};
};

export const styleFromJSON = (json: Record<string, any>) => {
	const stroke = json.stroke ? {
		color: Color4.fromHex(json.stroke.color),
		width: json.stroke.width,
	} : undefined;
	return {
		fill: Color4.fromHex(json.fill),
		stroke,
	};
};
