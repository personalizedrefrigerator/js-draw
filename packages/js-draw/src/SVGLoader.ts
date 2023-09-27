import { Color4, Mat33, Path, Rect2, Vec2 } from '@js-draw/math';
import AbstractComponent from './components/AbstractComponent';
import BackgroundComponent, { BackgroundType, backgroundTypeToClassNameMap, imageBackgroundCSSClassName, imageBackgroundGridSizeCSSPrefix, imageBackgroundNonAutomaticSecondaryColorCSSClassName } from './components/BackgroundComponent';
import ImageComponent from './components/ImageComponent';
import Stroke from './components/Stroke';
import SVGGlobalAttributesObject from './components/SVGGlobalAttributesObject';
import TextComponent, { TextTransformMode } from './components/TextComponent';
import UnknownSVGObject from './components/UnknownSVGObject';
import RenderingStyle from './rendering/RenderingStyle';
import TextRenderingStyle from './rendering/TextRenderingStyle';
import { ComponentAddedListener, ImageLoader, OnDetermineExportRectListener, OnProgressListener } from './types';
import RenderablePathSpec, { pathToRenderable } from './rendering/RenderablePathSpec';

type OnFinishListener = ()=> void;

// Size of a loaded image if no size is specified.
export const defaultSVGViewRect = new Rect2(0, 0, 500, 500);

// Key to retrieve unrecognised attributes from an AbstractComponent
export const svgAttributesDataKey = 'svgAttrs';

// Like {@link svgAttributesDataKey}, but for styles
export const svgStyleAttributesDataKey = 'svgStyleAttrs';

// Key that specifies the ID of an SVG element that contained a given node when the image
// was first loaded.
export const svgLoaderAttributeContainerID = 'svgContainerID';

// If present in the exported SVG's class list, the image will be
// autoresized when components are added/removed.
export const svgLoaderAutoresizeClassName = 'js-draw--autoresize';

// [key, value]
export type SVGLoaderUnknownAttribute = [ string, string ];

// [key, value, priority]
export type SVGLoaderUnknownStyleAttribute = { key: string, value: string, priority?: string };

export interface SVGLoaderOptions {
	sanitize?: boolean;
	disableUnknownObjectWarnings?: boolean;
}

const supportedStrokeFillStyleAttrs = [ 'stroke', 'fill', 'stroke-width' ];

// Handles loading images from SVG.
export default class SVGLoader implements ImageLoader {
	private onAddComponent: ComponentAddedListener|null = null;
	private onProgress: OnProgressListener|null = null;
	private onDetermineExportRect: OnDetermineExportRectListener|null = null;

	private processedCount: number = 0;
	private totalToProcess: number = 0;
	private rootViewBox: Rect2|null;

	// Options
	private readonly storeUnknown: boolean;
	private readonly disableUnknownObjectWarnings: boolean;

	private constructor(
		private source: SVGSVGElement,
		private onFinish: OnFinishListener,
		options: SVGLoaderOptions,
	) {
		this.storeUnknown = !(options.sanitize ?? false);
		this.disableUnknownObjectWarnings = !!options.disableUnknownObjectWarnings;
	}

	// If [computedStyles] is given, it is preferred to directly accessing node's style object.
	private getStyle(node: SVGElement, computedStyles?: CSSStyleDeclaration) {
		let fill = Color4.transparent;
		let stroke;

		// If possible, use computedStyles (allows property inheritance).
		const fillAttribute = node.getAttribute('fill') ?? computedStyles?.fill ?? node.style.fill;
		if (fillAttribute) {
			try {
				fill = Color4.fromString(fillAttribute);
			} catch (e) {
				console.error('Unknown fill color,', fillAttribute);
			}
		}

		const strokeAttribute = node.getAttribute('stroke') ?? computedStyles?.stroke ?? node.style.stroke;
		const strokeWidthAttr = node.getAttribute('stroke-width') ?? computedStyles?.strokeWidth ?? node.style.strokeWidth;
		if (strokeAttribute && strokeWidthAttr) {
			try {
				let width = parseFloat(strokeWidthAttr ?? '1');
				if (!isFinite(width)) {
					width = 0;
				}

				const strokeColor = Color4.fromString(strokeAttribute);

				if (strokeColor.a > 0) {
					stroke = {
						width,
						color: strokeColor,
					};
				}
			} catch (e) {
				console.error('Error parsing stroke data:', e);
			}
		}

		const style: RenderingStyle = {
			fill,
			stroke,
		};
		return style;
	}

	private strokeDataFromElem(node: SVGPathElement): RenderablePathSpec[] {
		const result: RenderablePathSpec[] = [];
		const pathData = node.getAttribute('d') ?? '';
		const style = this.getStyle(node);

		// Break the path into chunks at each moveTo ('M') command:
		const parts = pathData.split('M');
		let isFirst = true;
		for (const part of parts) {
			// Skip effective no-ops -- moveTos without additional commands.
			const isNoOpMoveTo = /^[0-9., \t\n]+$/.exec(part);

			if (part !== '' && !isNoOpMoveTo) {
				// We split the path by moveTo commands, so add the 'M' back in
				// if it was present.
				const current = !isFirst ? `M${part}` : part;

				const path = Path.fromString(current);
				const spec = pathToRenderable(path, style);
				result.push(spec);
			}

			isFirst = false;
		}

		return result;
	}

	private attachUnrecognisedAttrs(
		elem: AbstractComponent,
		node: SVGElement,
		supportedAttrs: Set<string>,
		supportedStyleAttrs?: Set<string>
	) {
		if (!this.storeUnknown) {
			return;
		}

		for (const attr of node.getAttributeNames()) {
			if (supportedAttrs.has(attr) || (attr === 'style' && supportedStyleAttrs)) {
				continue;
			}

			elem.attachLoadSaveData(svgAttributesDataKey,
				[ attr, node.getAttribute(attr) ] as SVGLoaderUnknownAttribute,
			);
		}

		if (supportedStyleAttrs && node.style) {
			// Use a for loop instead of an iterator: js-dom seems to not
			// support using node.style as an iterator.
			for (let i = 0; i < node.style.length; i ++) {
				const attr = node.style[i];

				if (attr === '' || !attr) {
					continue;
				}

				if (supportedStyleAttrs.has(attr)) {
					continue;
				}

				// TODO: Do we need special logic for !important properties?
				elem.attachLoadSaveData(svgStyleAttributesDataKey,
					{
						key: attr,
						value: node.style.getPropertyValue(attr),
						priority: node.style.getPropertyPriority(attr)
					} as SVGLoaderUnknownStyleAttribute
				);
			}
		}
	}

	// Adds a stroke with a single path
	private async addPath(node: SVGPathElement) {
		let elem: AbstractComponent;
		try {
			const strokeData = this.strokeDataFromElem(node);

			elem = new Stroke(strokeData);

			this.attachUnrecognisedAttrs(
				elem, node,
				new Set([ ...supportedStrokeFillStyleAttrs, 'd' ]),
				new Set(supportedStrokeFillStyleAttrs)
			);
		} catch (e) {
			console.error(
				'Invalid path in node', node,
				'\nError:', e,
				'\nAdding as an unknown object.'
			);

			if (this.storeUnknown) {
				elem = new UnknownSVGObject(node);
			} else {
				return;
			}
		}
		await this.addComponent(elem);
	}

	private async addBackground(node: SVGElement) {
		// If a grid background,
		if (node.classList.contains(backgroundTypeToClassNameMap[BackgroundType.Grid])) {
			let foregroundStr: string|null;
			let backgroundStr: string|null;
			let gridStrokeWidthStr: string|null;

			// If a group,
			if (node.tagName.toLowerCase() === 'g') {
				// We expect exactly two children. One of these is the solid
				// background of the grid
				if (node.children.length !== 2) {
					await this.addUnknownNode(node);
					return;
				}

				const background = node.children[0];
				const grid = node.children[1];

				backgroundStr = background.getAttribute('fill');
				foregroundStr = grid.getAttribute('stroke');
				gridStrokeWidthStr = grid.getAttribute('stroke-width');
			} else {
				backgroundStr = node.getAttribute('fill');
				foregroundStr = node.getAttribute('stroke');
				gridStrokeWidthStr = node.getAttribute('stroke-width');
			}

			// Default to a transparent background.
			backgroundStr ??= Color4.transparent.toHexString();

			// A grid must have a foreground color specified.
			if (!foregroundStr) {
				await this.addUnknownNode(node);
				return;
			}

			// Extract the grid size from the class name
			let gridSize: number|undefined = undefined;
			for (const className of node.classList) {
				if (className.startsWith(imageBackgroundGridSizeCSSPrefix)) {
					const sizeStr = className.substring(imageBackgroundGridSizeCSSPrefix.length);
					gridSize = parseFloat(sizeStr.replace(/p/g, '.'));
				}
			}

			let gridStrokeWidth: number|undefined = undefined;
			if (gridStrokeWidthStr) {
				gridStrokeWidth = parseFloat(gridStrokeWidthStr);
			}

			const backgroundColor = Color4.fromString(backgroundStr);
			let foregroundColor: Color4|undefined = Color4.fromString(foregroundStr);

			// Should the foreground color be determined automatically?
			if (!node.classList.contains(imageBackgroundNonAutomaticSecondaryColorCSSClassName)) {
				foregroundColor = undefined;
			}

			const elem = BackgroundComponent.ofGrid(
				backgroundColor, gridSize, foregroundColor, gridStrokeWidth
			);
			await this.addComponent(elem);
		}
		// Otherwise, if just a <path/>, it's a solid color background.
		else if (node.tagName.toLowerCase() === 'path') {
			const fill = Color4.fromString(node.getAttribute('fill') ?? node.style.fill ?? 'black');
			const elem = new BackgroundComponent(BackgroundType.SolidColor, fill);
			await this.addComponent(elem);
		}
		else {
			await this.addUnknownNode(node);
		}
	}

	// If given, 'supportedAttrs' will have x, y, etc. attributes that were used in computing the transform added to it,
	// to prevent storing duplicate transform information when saving the component.
	private getTransform(elem: SVGElement, supportedAttrs?: string[], computedStyles?: CSSStyleDeclaration): Mat33 {
		// If possible, load the js-draw specific transform attribute
		const highpTransformAttribute = 'data-highp-transform';
		const rawTransformData = elem.getAttribute(highpTransformAttribute);
		let transform;
		if (rawTransformData) {
			try {
				transform = Mat33.fromCSSMatrix(rawTransformData);
				supportedAttrs?.push(highpTransformAttribute);
			} catch(e) {
				console.warn(`Unable to parse raw transform data, ${rawTransformData}. Falling back to CSS data.`);
			}
		}

		if (!transform) {
			computedStyles ??= window.getComputedStyle(elem);

			let transformProperty = computedStyles.transform;
			if (transformProperty === '' || transformProperty === 'none') {
				transformProperty = elem.style.transform || 'none';
			}

			// Prefer the actual .style.transform
			// to the computed stylesheet -- in some browsers, the computedStyles version
			// can have lower precision.
			try {
				transform = Mat33.fromCSSMatrix(elem.style.transform);
			} catch(_e) {
				console.warn('matrix parse error', _e);
				transform = Mat33.fromCSSMatrix(transformProperty);
			}

			const elemX = elem.getAttribute('x');
			const elemY = elem.getAttribute('y');
			if (elemX || elemY) {
				const x = parseFloat(elemX ?? '0');
				const y = parseFloat(elemY ?? '0');
				if (!isNaN(x) && !isNaN(y)) {
					supportedAttrs?.push('x', 'y');
					transform = transform.rightMul(Mat33.translation(Vec2.of(x, y)));
				}
			}
		}

		return transform;
	}

	private makeText(elem: SVGTextElement|SVGTSpanElement): TextComponent {
		const contentList: Array<TextComponent|string> = [];
		for (const child of elem.childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				contentList.push(child.nodeValue ?? '');
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				const subElem = child as SVGElement;
				if (subElem.tagName.toLowerCase() === 'tspan') {
					// FIXME: tspan's (x, y) components are absolute, not relative to the parent.
					contentList.push(this.makeText(subElem as SVGTSpanElement));
				} else {
					throw new Error(`Unrecognized text child element: ${subElem}`);
				}
			} else {
				throw new Error(`Unrecognized text child node: ${child}.`);
			}
		}

		// If no content, the content is an empty string.
		if (contentList.length === 0) {
			contentList.push('');
		}

		// Compute styles.
		const computedStyles = window.getComputedStyle(elem);
		const fontSizeExp = /^([-0-9.e]+)px/i;

		// In some environments, computedStyles.fontSize can be increased by the system.
		// Thus, to prevent text from growing on load/save, prefer .style.fontSize.
		let fontSizeMatch = fontSizeExp.exec(elem.style.fontSize);
		if (!fontSizeMatch && elem.tagName.toLowerCase() === 'tspan' && elem.parentElement) {
			// Try to inherit the font size of the parent text element.
			fontSizeMatch = fontSizeExp.exec(elem.parentElement.style.fontSize);
		}

		// If we still couldn't find a font size, try to use computedStyles (which can be
		// wrong).
		if (!fontSizeMatch) {
			fontSizeMatch = fontSizeExp.exec(computedStyles.fontSize);
		}

		const supportedStyleAttrs = [
			'fontFamily',
			'transform',
			...supportedStrokeFillStyleAttrs,
		];
		let fontSize = 12;
		if (fontSizeMatch) {
			supportedStyleAttrs.push('fontSize');
			fontSize = parseFloat(fontSizeMatch[1]);
		}
		const style: TextRenderingStyle = {
			size: fontSize,
			fontFamily: computedStyles.fontFamily || elem.style.fontFamily || 'sans-serif',
			fontWeight: computedStyles.fontWeight || elem.style.fontWeight || undefined,
			fontStyle: computedStyles.fontStyle || elem.style.fontStyle || undefined,
			renderingStyle: this.getStyle(elem, computedStyles),
		};

		const supportedAttrs: string[] = [];
		let transform = this.getTransform(elem, supportedAttrs, computedStyles);
		let transformMode = TextTransformMode.ABSOLUTE_XY;

		const elemDX = elem.getAttribute('dx');
		if (elemDX) {
			transformMode = TextTransformMode.RELATIVE_X_ABSOLUTE_Y;
			transform = transform.rightMul(Mat33.translation(Vec2.of(parseFloat(elemDX), 0)));
			supportedAttrs.push('dx');
		}

		const elemDY = elem.getAttribute('dy');
		if (elemDY) {
			if (transformMode === TextTransformMode.RELATIVE_X_ABSOLUTE_Y) {
				transformMode = TextTransformMode.RELATIVE_XY;
			} else {
				transformMode = TextTransformMode.RELATIVE_Y_ABSOLUTE_X;
			}

			transform = transform.rightMul(Mat33.translation(Vec2.of(0, parseFloat(elemDY))));
			supportedAttrs.push('dy');
		}

		const result = new TextComponent(contentList, transform, style, transformMode);
		this.attachUnrecognisedAttrs(
			result,
			elem,
			new Set(supportedAttrs),
			new Set(supportedStyleAttrs)
		);

		return result;
	}

	private async addText(elem: SVGTextElement|SVGTSpanElement) {
		try {
			const textElem = this.makeText(elem);
			await this.addComponent(textElem);
		} catch (e) {
			console.error('Invalid text object in node', elem, '. Continuing.... Error:', e);
			this.addUnknownNode(elem);
		}
	}

	private async addImage(elem: SVGImageElement) {
		const image = new Image();
		image.src = elem.getAttribute('xlink:href') ?? elem.href.baseVal;
		image.setAttribute('alt', elem.getAttribute('aria-label') ?? '');

		try {
			const supportedAttrs: string[] = [];
			const transform = this.getTransform(elem, supportedAttrs);
			const imageElem = await ImageComponent.fromImage(image, transform);
			this.attachUnrecognisedAttrs(
				imageElem,
				elem,
				new Set(supportedAttrs),
				new Set([ 'transform' ])
			);

			await this.addComponent(imageElem);
		} catch (e) {
			console.error('Error loading image:', e, '. Element: ', elem, '. Continuing...');
			await this.addUnknownNode(elem);
		}
	}

	private async addUnknownNode(node: SVGElement) {
		if (this.storeUnknown) {
			const component = new UnknownSVGObject(node);
			await this.addComponent(component);
		}
	}

	private containerGroupIDs: string[] = [];
	private encounteredIDs: string[] = [];
	private async startGroup(node: SVGGElement) {
		node = node.cloneNode(false) as SVGGElement;

		// Select a unique ID based on the node's ID property (if it exists).
		// Use `||` and not `??` so that empty string IDs are also replaced.
		let id = node.id || `id-${this.encounteredIDs.length}`;

		// Make id unique.
		let idSuffixCounter = 0;
		let suffix = '';
		while (this.encounteredIDs.includes(id + suffix)) {
			idSuffixCounter ++;
			suffix = '--' + idSuffixCounter;
		}
		id += suffix;

		// Remove all children from the node -- children will be handled separately
		// (not removing children here could cause duplicates in the result, when rendered).
		node.replaceChildren();

		node.id = id;

		const component = new UnknownSVGObject(node);
		this.addComponent(component);

		// Add to IDs after -- we don't want the <g> element to be marked
		// as its own container.
		this.containerGroupIDs.push(node.id);
		this.encounteredIDs.push(node.id);
	}

	// Ends the most recent group started by .startGroup
	private async endGroup() {
		this.containerGroupIDs.pop();
	}

	private async addComponent(component: AbstractComponent) {
		// Attach the stack of container IDs
		if (this.containerGroupIDs.length > 0) {
			component.attachLoadSaveData(
				svgLoaderAttributeContainerID,
				[ ...this.containerGroupIDs ]
			);
		}

		await this.onAddComponent?.(component);
	}

	private updateViewBox(node: SVGSVGElement) {
		const viewBoxAttr = node.getAttribute('viewBox');
		if (this.rootViewBox || !viewBoxAttr) {
			return;
		}

		const components = viewBoxAttr.split(/[ \t\n,]+/);
		const x = parseFloat(components[0]);
		const y = parseFloat(components[1]);
		const width = parseFloat(components[2]);
		const height = parseFloat(components[3]);

		if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
			console.warn(`node ${node} has an unparsable viewbox. Viewbox: ${viewBoxAttr}. Match: ${components}.`);
			return;
		}

		const autoresize = node.classList.contains(svgLoaderAutoresizeClassName);

		this.rootViewBox = new Rect2(x, y, width, height);
		this.onDetermineExportRect?.(this.rootViewBox, { autoresize });
	}

	private async updateSVGAttrs(node: SVGSVGElement) {
		if (this.storeUnknown) {
			await this.onAddComponent?.(new SVGGlobalAttributesObject(this.getSourceAttrs(node)));
		}
	}

	private async visit(node: Element) {
		this.totalToProcess += node.childElementCount;
		let visitChildren = true;

		switch (node.tagName.toLowerCase()) {
		case 'g':
			if (node.classList.contains(imageBackgroundCSSClassName)) {
				await this.addBackground(node as SVGElement);
				visitChildren = false;
			} else {
				await this.startGroup(node as SVGGElement);
			}
			// Otherwise, continue -- visit the node's children.
			break;
		case 'path':
			if (node.classList.contains(imageBackgroundCSSClassName)) {
				await this.addBackground(node as SVGElement);
			} else {
				await this.addPath(node as SVGPathElement);
			}
			break;
		case 'text':
			await this.addText(node as SVGTextElement);
			visitChildren = false;
			break;
		case 'image':
			await this.addImage(node as SVGImageElement);

			// Images should not have children.
			visitChildren = false;
			break;
		case 'svg':
			this.updateViewBox(node as SVGSVGElement);
			this.updateSVGAttrs(node as SVGSVGElement);
			break;
		case 'style':
			await this.addUnknownNode(node as SVGStyleElement);
			break;
		default:
			if (!this.disableUnknownObjectWarnings) {
				console.warn('Unknown SVG element,', node, node.tagName);
				if (!(node instanceof SVGElement)) {
					console.warn(
						'Element', node, 'is not an SVGElement!', this.storeUnknown ? 'Continuing anyway.' : 'Skipping.'
					);
				}
			}

			await this.addUnknownNode(node as SVGElement);
			return;
		}

		if (visitChildren) {
			for (const child of node.children) {
				await this.visit(child);
			}

			if (node.tagName.toLowerCase() === 'g') {
				await this.endGroup();
			}
		}

		this.processedCount ++;
		await this.onProgress?.(this.processedCount, this.totalToProcess);
	}

	// Get SVG element attributes (e.g. xlink=...)
	private getSourceAttrs(node: SVGSVGElement): Array<[string, string|null]> {
		return node.getAttributeNames().map(attr => {
			return [ attr, node.getAttribute(attr) ];
		});
	}

	public async start(
		onAddComponent: ComponentAddedListener, onProgress: OnProgressListener,
		onDetermineExportRect: OnDetermineExportRectListener|null = null
	): Promise<void> {
		this.onAddComponent = onAddComponent;
		this.onProgress = onProgress;
		this.onDetermineExportRect = onDetermineExportRect;

		// Estimate the number of tags to process.
		this.totalToProcess = this.source.childElementCount;
		this.processedCount = 0;

		this.rootViewBox = null;
		await this.visit(this.source);

		const viewBox = this.rootViewBox;

		if (!viewBox) {
			this.onDetermineExportRect?.(defaultSVGViewRect);
		}

		this.onFinish?.();
	}

	/**
	 * Create an `SVGLoader` from the content of an SVG image. SVGs are loaded within a sandboxed
	 * iframe with `sandbox="allow-same-origin"`
	 * [thereby disabling JavaScript](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox).
	 *
	 * @see {@link Editor.loadFrom}
	 * @param text - Textual representation of the SVG (e.g. `<svg viewbox='...'>...</svg>`).
	 * @param options - if `true` or `false`, treated as the `sanitize` option -- don't store unknown attributes.
	 */
	public static fromString(
		text: string,
		options: Partial<SVGLoaderOptions>|boolean = false
	): SVGLoader {
		const sandbox = document.createElement('iframe');
		sandbox.src = 'about:blank';
		sandbox.setAttribute('sandbox', 'allow-same-origin');
		sandbox.setAttribute('csp', 'default-src \'about:blank\'');
		sandbox.style.display = 'none';

		// Required to access the frame's DOM. See https://stackoverflow.com/a/17777943/17055750
		document.body.appendChild(sandbox);

		if (!sandbox.hasAttribute('sandbox')) {
			sandbox.remove();
			throw new Error('SVG loading iframe is not sandboxed.');
		}

		const sandboxDoc = sandbox.contentWindow?.document ?? sandbox.contentDocument;
		if (sandboxDoc == null) throw new Error('Unable to open a sandboxed iframe!');

		sandboxDoc.open();
		sandboxDoc.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>SVG Loading Sandbox</title>
					<meta name='viewport' conent='width=device-width,initial-scale=1.0'/>
					<meta charset='utf-8'/>
				</head>
				<body style='font-size: 12px;'>
					<script>
						console.error('JavaScript should not be able to run here!');
						throw new Error(
							'The SVG sandbox is broken! Please double-check the sandboxing setting.'
						);
					</script>
				</body>
			</html>
		`);
		sandboxDoc.close();

		const svgElem = sandboxDoc.createElementNS(
			'http://www.w3.org/2000/svg', 'svg'
		);
		svgElem.innerHTML = text;
		sandboxDoc.body.appendChild(svgElem);

		// Handle options
		let sanitize;
		let disableUnknownObjectWarnings;

		if (typeof options === 'boolean') {
			sanitize = options;
			disableUnknownObjectWarnings = false;
		} else {
			sanitize = options.sanitize ?? false;
			disableUnknownObjectWarnings = options.disableUnknownObjectWarnings ?? false;
		}


		return new SVGLoader(svgElem, () => {
			svgElem.remove();
			sandbox.remove();
		}, {
			sanitize, disableUnknownObjectWarnings,
		});
	}
}
