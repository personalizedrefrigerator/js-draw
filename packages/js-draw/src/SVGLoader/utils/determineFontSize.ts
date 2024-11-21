/** Computes the font size of a text element, based on style information. */
const determineFontSize = (
	elem: SVGTextElement | SVGTSpanElement,
	computedStyles: CSSStyleDeclaration | undefined,

	// output: Written to to update supported style attributes
	supportedStyleAttrs: Set<string>,
) => {
	const fontSizeExp = /^([-0-9.e]+)px/i;

	// In some environments, computedStyles.fontSize can be increased by the system.
	// Thus, to prevent text from growing on load/save, prefer .style.fontSize.
	let fontSizeMatch = fontSizeExp.exec(elem.style?.fontSize ?? '');
	if (!fontSizeMatch && elem.tagName.toLowerCase() === 'tspan' && elem.parentElement) {
		// Try to inherit the font size of the parent text element.
		fontSizeMatch = fontSizeExp.exec(elem.parentElement.style?.fontSize ?? '');
	}

	// If we still couldn't find a font size, try to use computedStyles (which can be
	// wrong).
	if (!fontSizeMatch && computedStyles) {
		fontSizeMatch = fontSizeExp.exec(computedStyles.fontSize);
	}

	let fontSize = 12;
	if (fontSizeMatch) {
		supportedStyleAttrs.add('fontSize');
		fontSize = parseFloat(fontSizeMatch[1]);
	}
	return fontSize;
};

export default determineFontSize;
