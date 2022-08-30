import Color4 from './Color4';
import AbstractComponent from './components/AbstractComponent';
import Stroke from './components/Stroke';
import SVGGlobalAttributesObject from './components/SVGGlobalAttributesObject';
import UnknownSVGObject from './components/UnknownSVGObject';
import Path from './geometry/Path';
import Rect2 from './geometry/Rect2';
import { RenderablePathSpec, RenderingStyle } from './rendering/AbstractRenderer';
import { ComponentAddedListener, ImageLoader, OnDetermineExportRectListener, OnProgressListener } from './types';

type OnFinishListener = ()=> void;

// Size of a loaded image if no size is specified.
export const defaultSVGViewRect = new Rect2(0, 0, 500, 500);

export default class SVGLoader implements ImageLoader {
	private onAddComponent: ComponentAddedListener|null = null;
	private onProgress: OnProgressListener|null = null;
	private onDetermineExportRect: OnDetermineExportRectListener|null = null;

	private processedCount: number = 0;
	private totalToProcess: number = 0;
	private rootViewBox: Rect2|null;

	private constructor(private source: SVGSVGElement, private onFinish?: OnFinishListener) {
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

	// Adds a stroke with a single path
	private addPath(node: SVGPathElement) {
		let elem: AbstractComponent;
		try {
			const strokeData = this.strokeDataFromElem(node);
			elem = new Stroke(strokeData);
		} catch (e) {
			console.error(
				'Invalid path in node', node,
				'\nError:', e,
				'\nAdding as an unknown object.'
			);

			elem = new UnknownSVGObject(node);
		}
		this.onAddComponent?.(elem);
	}

	private addUnknownNode(node: SVGElement) {
		const component = new UnknownSVGObject(node);
		this.onAddComponent?.(component);
	}

	private updateViewBox(node: SVGSVGElement) {
		const viewBoxAttr = node.getAttribute('viewBox');
		if (this.rootViewBox || !viewBoxAttr) {
			return;
		}

		const components = viewBoxAttr.split(/[ \t,]/);
		const x = parseFloat(components[0]);
		const y = parseFloat(components[1]);
		const width = parseFloat(components[2]);
		const height = parseFloat(components[3]);

		if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
			return;
		}

		this.rootViewBox = new Rect2(x, y, width, height);
		this.onDetermineExportRect?.(this.rootViewBox);
	}

	private updateSVGAttrs(node: SVGSVGElement) {
		this.onAddComponent?.(new SVGGlobalAttributesObject(this.getSourceAttrs(node)));
	}

	private async visit(node: Element) {
		this.totalToProcess += node.childElementCount;

		switch (node.tagName.toLowerCase()) {
		case 'g':
			// Continue -- visit the node's children.
			break;
		case 'path':
			this.addPath(node as SVGPathElement);
			break;
		case 'svg':
			this.updateViewBox(node as SVGSVGElement);
			this.updateSVGAttrs(node as SVGSVGElement);
			break;
		default:
			console.warn('Unknown SVG element,', node);
			if (!(node instanceof SVGElement)) {
				console.warn('Element', node, 'is not an SVGElement! Continuing anyway.');
			}

			this.addUnknownNode(node as SVGElement);
			return;
		}

		for (const child of node.children) {
			await this.visit(child);
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

	// TODO: Handling unsafe data! Tripple-check that this is secure!
	public static fromString(text: string): SVGLoader {
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

		// Try running JavaScript within the iframe
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

		return new SVGLoader(svgElem, () => {
			sandbox.remove();
		});
	}
}
