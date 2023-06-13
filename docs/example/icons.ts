
// This file contains code for creating icons specific to the example app.
// js-draw has its own code for creating icons (e.g. toolbar icons).

const svgNamespace = 'http://www.w3.org/2000/svg';

// Create an icon that contains text and nothing else. This might be
// useful, for example, to create a "+" icon or a "?" icon.
export const makeIconFromText = (text: string) => {
	const icon = document.createElementNS(svgNamespace, 'svg');

	const addTextNodeWithStyles = (styles: string) => {
		const textNode = document.createElementNS(svgNamespace, 'text');
		textNode.appendChild(document.createTextNode(text));
		textNode.setAttribute('x', '50');
		textNode.setAttribute('y', '50');
		textNode.setAttribute('style', `
			text-anchor: middle;
			dominant-baseline: middle;
			font-size: 100px;
			${styles}
		`);

		icon.appendChild(textNode);
	};

	// Shadow
	addTextNodeWithStyles(`
		fill: var(--icon-color);
		filter: blur(4px) invert(1);
	`);

	// Foreground
	addTextNodeWithStyles('fill: var(--icon-color);');

	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

