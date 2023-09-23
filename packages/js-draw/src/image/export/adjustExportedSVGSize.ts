import { Rect2, toRoundedString } from '@js-draw/math';

// @internal
export type SVGSizingOptions = { minDimension?: number };

// @internal
const adjustExportedSVGSize = (
	svg: SVGElement, exportRect: Rect2, options: SVGSizingOptions
) => {
	// Adjust the width/height as necessary
	let width = exportRect.w;
	let height = exportRect.h;

	if (options?.minDimension && width < options.minDimension) {
		const newWidth = options.minDimension;
		height *= newWidth / (width || 1);
		width = newWidth;
	}

	if (options?.minDimension && height < options.minDimension) {
		const newHeight = options.minDimension;
		width *= newHeight / (height || 1);
		height = newHeight;
	}

	svg.setAttribute('width', toRoundedString(width));
	svg.setAttribute('height', toRoundedString(height));
};

export default adjustExportedSVGSize;

