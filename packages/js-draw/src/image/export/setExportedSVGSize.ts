import { toRoundedString } from '@js-draw/math';
import Viewport from '../../Viewport';

// @internal
export type SVGSizingOptions = { minDimension?: number };

// @internal
const setExportedSVGSize = (
	svg: SVGElement, viewport: Viewport, options: SVGSizingOptions
) => {
	// Just show the main region
	const rect = viewport.visibleRect;
	svg.setAttribute('viewBox', [rect.x, rect.y, rect.w, rect.h].map(part => toRoundedString(part)).join(' '));

	// Adjust the width/height as necessary
	let width = rect.w;
	let height = rect.h;

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

export default setExportedSVGSize;

