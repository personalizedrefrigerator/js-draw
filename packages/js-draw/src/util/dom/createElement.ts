type ElementTagNames = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;

/**
 * Maps from known elment tag names to options that can be set with .setAttribute.
 * New elements/properties should be added as necessary.
 */
interface ElementToPropertiesMap {
	path: {
		d: string;
		fill: string;
		stroke: string;
		'stroke-width': string;
		transform: string;
	};
	button: {
		type: 'button';
	};
	rect: {
		stroke: string;
		fill: string;
		x: number;
		y: number;
		width: number;
		height: number;
		transform: string;
	};
	pattern: {
		viewBox: string;
		width: string;
		height: string;
		patternUnits: 'userSpaceOnUse';
	};
	stop: {
		offset: string;
		'stop-color': string;
	};
	svg: {
		viewBox: `${number} ${number} ${number} ${number}`;
	};
}
type EmptyObject = Record<never, never>;
type ElementProperties<Tag extends ElementTagNames> = Tag extends keyof ElementToPropertiesMap
	? Partial<ElementToPropertiesMap[Tag]>
	: EmptyObject;

/** Contains options for creating an element with tag = `Tag`. */
type ElementConfig<Tag extends ElementTagNames> = ElementProperties<Tag> & {
	id?: string;
	children?: (HTMLElement | SVGElement)[];
};

/**
 * Maps from element tag names (e.g. `Tag='button'`) to the corresponding element type
 * (e.g. `HTMLButtonElement`).
 */
type ElementTagToType<Tag extends ElementTagNames> = Tag extends keyof HTMLElementTagNameMap
	? HTMLElementTagNameMap[Tag]
	: Tag extends keyof SVGElementTagNameMap
		? SVGElementTagNameMap[Tag]
		: never;

export enum ElementNamespace {
	Html = 'html',
	Svg = 'svg',
}

/**
 * Shorthand for creating an element with `document.createElement`, then assigning properties.
 *
 * Non-HTML elements (e.g. `svg` elements) should use the `elementType` parameter to select
 * the element namespace.
 */
const createElement = <Tag extends ElementTagNames>(
	tag: Tag,
	props: ElementConfig<Tag>,
	elementType: ElementNamespace = ElementNamespace.Html,
): ElementTagToType<Tag> => {
	let elem: ElementTagToType<Tag>;
	if (elementType === ElementNamespace.Html) {
		elem = document.createElement(tag) as ElementTagToType<Tag>;
	} else if (elementType === ElementNamespace.Svg) {
		elem = document.createElementNS('http://www.w3.org/2000/svg', tag) as ElementTagToType<Tag>;
	} else {
		throw new Error(`Unknown element type ${elementType}`);
	}

	for (const [key, value] of Object.entries(props)) {
		if (key === 'children') continue;

		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new Error(`Unsupported value type ${typeof value}`);
		}
		elem.setAttribute(key, value.toString());
	}

	if (props.children) {
		for (const item of props.children) {
			elem.appendChild(item);
		}
	}

	return elem;
};

export const createSvgElement = <Tag extends keyof SVGElementTagNameMap>(
	tag: Tag,
	props: ElementConfig<Tag>,
) => {
	return createElement(tag, props, ElementNamespace.Svg);
};

export const createSvgElements = <Tag extends keyof SVGElementTagNameMap>(
	tag: Tag,
	elements: ElementConfig<Tag>[],
) => {
	return elements.map((props) => createSvgElement(tag, props));
};

export const createSvgPaths = (...paths: ElementConfig<'path'>[]) => {
	return createSvgElements('path', paths);
};

export default createElement;
