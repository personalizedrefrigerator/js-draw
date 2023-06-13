
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

export const makeLocalStorageIcon = () => {
	const elem = document.createElementNS(svgNamespace, 'svg');
	const iconFillSStyle = 'style="fill: var(--icon-color);"';
	elem.innerHTML = `
		<path d="M 50,10 V 60 H 35 L 55,85 75,60 H 60 V 10 Z" ${iconFillSStyle}/>
		<path d="m 15,85 v 10 h 85 V 85 Z" ${iconFillSStyle}/>
	`;
	elem.setAttribute('viewBox', '5 0 100 100');

	return elem;
};
