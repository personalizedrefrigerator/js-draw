import Color4 from './Color4';
import AbstractComponent from './components/AbstractComponent';
import ImageComponent from './components/ImageComponent';
import Stroke from './components/Stroke';
import SVGGlobalAttributesObject from './components/SVGGlobalAttributesObject';
import TextComponent, { TextStyle } from './components/Text';
import UnknownSVGObject from './components/UnknownSVGObject';
import Mat33 from './math/Mat33';
import Path from './math/Path';
import Rect2 from './math/Rect2';
import { Vec2 } from './math/Vec2';
import { RenderablePathSpec } from './rendering/renderers/AbstractRenderer';
import RenderingStyle from './rendering/RenderingStyle';
import { ComponentAddedListener, ImageLoader, OnDetermineExportRectListener, OnProgressListener } from './types';

type OnFinishListener = ()=> void;

// Size of a loaded image if no size is specified.
export const defaultSVGViewRect = new Rect2(0, 0, 500, 500);

// Key to retrieve unrecognised attributes from an AbstractComponent
export const svgAttributesDataKey = 'svgAttrs';
export const svgStyleAttributesDataKey = 'svgStyleAttrs';

// [key, value]
export type SVGLoaderUnknownAttribute = [ string, string ];

// [key, value, priority]
export type SVGLoaderUnknownStyleAttribute = { key: string, value: string, priority?: string };

export default class SVGLoader implements ImageLoader {
	private onAddComponent: ComponentAddedListener|null = null;
	private onProgress: OnProgressListener|null = null;
	private onDetermineExportRect: OnDetermineExportRectListener|null = null;

	private processedCount: number = 0;
	private totalToProcess: number = 0;
	private rootViewBox: Rect2|null;

	private constructor(
		private source: SVGSVGElement, private onFinish?: OnFinishListener, private readonly storeUnknown: boolean = true) {
	}

	private getStyle(node: SVGElement) {
		const style: RenderingStyle = {
			fill: Color4.transparent,
		};

		const fillAttribute = node.getAttribute('fill') ?? node.style.fill;
		if (fillAttribute) {
			try {
				style.fill = Color4.fromString(fillAttribute);
			} catch (e) {
				console.error('Unknown fill color,', fillAttribute);
			}
		}

		const strokeAttribute = node.getAttribute('stroke') ?? node.style.stroke;
		const strokeWidthAttr = node.getAttribute('stroke-width') ?? node.style.strokeWidth;
		if (strokeAttribute) {
			try {
				let width = parseFloat(strokeWidthAttr ?? '1');
				if (!isFinite(width)) {
					width = 0;
				}

				style.stroke = {
					width,
					color: Color4.fromString(strokeAttribute),
				};
			} catch (e) {
				console.error('Error parsing stroke data:', e);
			}
		}

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
				const spec = path.toRenderable(style);
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
			for (const attr of node.style) {
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
	private addPath(node: SVGPathElement) {
		let elem: AbstractComponent;
		try {
			const strokeData = this.strokeDataFromElem(node);

			elem = new Stroke(strokeData);

			const supportedStyleAttrs = [ 'stroke', 'fill', 'stroke-width' ];
			this.attachUnrecognisedAttrs(
				elem, node,
				new Set([ ...supportedStyleAttrs, 'd' ]),
				new Set(supportedStyleAttrs)
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
		this.onAddComponent?.(elem);
	}

	// If given, 'supportedAttrs' will have x, y, etc. attributes that were used in computing the transform added to it,
	// to prevent storing duplicate transform information when saving the component.
	private getTransform(elem: SVGElement, supportedAttrs?: string[], computedStyles?: CSSStyleDeclaration): Mat33 {
		computedStyles ??= window.getComputedStyle(elem);
		
		let transformProperty = computedStyles.transform;
		if (transformProperty === '' || transformProperty === 'none') {
			transformProperty = elem.style.transform || 'none';
		}

		// Prefer the actual .style.transform
		// to the computed stylesheet -- in some browsers, the computedStyles version
		// can have lower precision.
		let transform;
		try {
			transform = Mat33.fromCSSMatrix(elem.style.transform);
		} catch(_e) {
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
					contentList.push(this.makeText(subElem as SVGTSpanElement));
				} else {
					throw new Error(`Unrecognized text child element: ${subElem}`);
				}
			} else {
				throw new Error(`Unrecognized text child node: ${child}.`);
			}
		}

		// Compute styles.
		const computedStyles = window.getComputedStyle(elem);
		const fontSizeMatch = /^([-0-9.e]+)px/i.exec(computedStyles.fontSize);

		const supportedStyleAttrs = [
			'fontFamily',
			'fill',
			'transform'
		];
		let fontSize = 12;
		if (fontSizeMatch) {
			supportedStyleAttrs.push('fontSize');
			fontSize = parseFloat(fontSizeMatch[1]);
		}
		const style: TextStyle = {
			size: fontSize,
			fontFamily: computedStyles.fontFamily || elem.style.fontFamily || 'sans-serif',
			renderingStyle: {
				fill: Color4.fromString(computedStyles.fill || elem.style.fill || '#000')
			},
		};

		const supportedAttrs: string[] = [];
		const transform = this.getTransform(elem, supportedAttrs, computedStyles);
		const result = new TextComponent(contentList, transform, style);
		this.attachUnrecognisedAttrs(
			result,
			elem,
			new Set(supportedAttrs),
			new Set(supportedStyleAttrs)
		);

		return result;
	}

	private addText(elem: SVGTextElement|SVGTSpanElement) {
		try {
			const textElem = this.makeText(elem);
			this.onAddComponent?.(textElem);
		} catch (e) {
			console.error('Invalid text object in node', elem, '. Continuing.... Error:', e);
			this.addUnknownNode(elem);
		}
	}

	private async addImage(elem: SVGImageElement) {
		const image = new Image();
		image.src = elem.getAttribute('xlink:href') ?? elem.href.baseVal;

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

			this.onAddComponent?.(imageElem);
		} catch (e) {
			console.error('Error loading image:', e, '. Element: ', elem, '. Continuing...');
			this.addUnknownNode(elem);
		}
	}

	private addUnknownNode(node: SVGElement) {
		if (this.storeUnknown) {
			const component = new UnknownSVGObject(node);
			this.onAddComponent?.(component);
		}
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

		this.rootViewBox = new Rect2(x, y, width, height);
		this.onDetermineExportRect?.(this.rootViewBox);
	}

	private updateSVGAttrs(node: SVGSVGElement) {
		if (this.storeUnknown) {
			this.onAddComponent?.(new SVGGlobalAttributesObject(this.getSourceAttrs(node)));
		}
	}

	private async visit(node: Element) {
		this.totalToProcess += node.childElementCount;
		let visitChildren = true;

		switch (node.tagName.toLowerCase()) {
		case 'g':
			// Continue -- visit the node's children.
			break;
		case 'path':
			this.addPath(node as SVGPathElement);
			break;
		case 'text':
			this.addText(node as SVGTextElement);
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
		default:
			console.warn('Unknown SVG element,', node);
			if (!(node instanceof SVGElement)) {
				console.warn(
					'Element', node, 'is not an SVGElement!', this.storeUnknown ? 'Continuing anyway.' : 'Skipping.'
				);
			}

			this.addUnknownNode(node as SVGElement);
			return;
		}

		if (visitChildren) {
			for (const child of node.children) {
				await this.visit(child);
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

	// @param sanitize - if `true`, don't store unknown attributes.
	public static fromString(text: string, sanitize: boolean = false): SVGLoader {
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
				</head>
				<body>
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

		return new SVGLoader(svgElem, () => {
			svgElem.remove();
			sandbox.remove();
		}, !sanitize);
	}
}
