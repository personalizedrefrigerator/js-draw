type ElementTagNames = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;

interface ElementToPropertiesMap {
	path: {
		d: string;
		fill: string;
		stroke: string;
		transform: string;
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

type ElementConfig<Tag extends ElementTagNames> = ElementProperties<Tag> & {
	id?: string;
	children?: (HTMLElement | SVGElement)[];
};

type ElementTagToType<Tag extends ElementTagNames> = Tag extends keyof HTMLElementTagNameMap
	? HTMLElementTagNameMap[Tag]
	: Tag extends keyof SVGElementTagNameMap
		? SVGElementTagNameMap[Tag]
		: never;

export enum ElementNamespace {
	Html = 'html',
	Svg = 'svg',
}

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
) => createElement(tag, props, ElementNamespace.Svg);

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
