
const svgNamespace = 'http://www.w3.org/2000/svg';

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

