import Color4 from '../Color4';
import { ComponentBuilderFactory } from '../components/builders/types';
import { Vec2 } from '../math/Vec2';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import TextStyle from '../rendering/TextRenderingStyle';
import Pen from '../tools/Pen';
import { StrokeDataPoint } from '../types';
import Viewport from '../Viewport';

export type IconType = HTMLImageElement|SVGElement;

const svgNamespace = 'http://www.w3.org/2000/svg';
const iconColorFill = `
	style='fill: var(--icon-color);'
`;
const iconColorStrokeFill = `
	style='fill: var(--icon-color); stroke: var(--icon-color);'
`;
const checkerboardPatternDef = `
	<pattern
		id='checkerboard'
		viewBox='0,0,10,10'
		width='20%'
		height='20%'
		patternUnits='userSpaceOnUse'
	>
		<rect x=0 y=0 width=10 height=10 fill='white'/>
		<rect x=0 y=0 width=5 height=5 fill='gray'/>
		<rect x=5 y=5 width=5 height=5 fill='gray'/>
	</pattern>
`;
const checkerboardPatternRef = 'url(#checkerboard)';

/**
 * Provides icons that can be used in the toolbar, etc.
 * Extend this class and override methods to customize icons.
 * 
 * @example
 * ```ts
 * class CustomIconProvider extends jsdraw.IconProvider {
 *     // Use '☺' instead of the default dropdown symbol.
 *     public makeDropdownIcon() {
 *         const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
 *         icon.innerHTML = `
 *             <text x='5' y='55' style='fill: var(--icon-color); font-size: 50pt;'>☺</text>
 *         `;
 *         icon.setAttribute('viewBox', '0 0 100 100');
 *         return icon;
 *     }
 * }
 * 
 * const icons = new CustomIconProvider();
 * const editor = new jsdraw.Editor(document.body, {
 *     iconProvider: icons,
 * });
 * 
 * // Add a toolbar that uses these icons
 * editor.addToolbar();
 * ```
 */
export default class IconProvider {
	
	public makeUndoIcon(): IconType {
		return this.makeRedoIcon(true);
	}

	// @param mirror - reflect across the x-axis. This parameter is internal.
	// @returns a redo icon.
	public makeRedoIcon(mirror: boolean = false): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.innerHTML = `
			<style>
				.toolbar-svg-undo-redo-icon {
					stroke: var(--icon-color);
					stroke-width: 12;
					stroke-linejoin: round;
					stroke-linecap: round;
					fill: none;
	
					transform-origin: center;
				}
			</style>
			<path
				d='M20,20 A15,15 0 0 1 70,80 L80,90 L60,70 L65,90 L87,90 L65,80'
				class='toolbar-svg-undo-redo-icon'
				style='${mirror ? 'transform: scale(-1, 1);' : ''}'/>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');
		return icon;
	}
	
	public makeDropdownIcon(): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.innerHTML = `
		<g>
			<path
				d='M5,10 L50,90 L95,10 Z'
				${iconColorFill}
			/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');
		return icon;
	}
	
	public makeEraserIcon(eraserSize?: number): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		eraserSize ??= 10;

		const scaledSize = eraserSize / 4;
		const eraserColor = '#ff70af';
	
		// Draw an eraser-like shape. Created with Inkscape
		icon.innerHTML = `
		<g>
			<path
				style="fill:${eraserColor}"
				stroke="black"
				transform="rotate(41.35)"
				d="M 52.5 27
					C 50 28.9 48.9 31.7 48.9 34.8
					L 48.9 39.8
					C 48.9 45.3 53.4 49.8 58.9 49.8
					L 103.9 49.8
					C 105.8 49.8 107.6 49.2 109.1 48.3
					L 110.2 ${scaledSize + 49.5} L 159.7 ${scaledSize + 5}
					L 157.7 ${-scaledSize + 5.2} L 112.4 ${49.5 - scaledSize}
					C 113.4 43.5 113.9 41.7 113.9 39.8
					L 113.9 34.8
					C 113.9 29.3 109.4 24.8 103.9 24.8
					L 58.9 24.8
					C 56.5 24.8 54.3 25.7 52.5 27
					z "
				id="path438" />

			<rect
				stroke="#cc8077"
				${iconColorFill}
				id="rect218"
				width="65"
				height="75"
				x="48.9"
				y="-38.7"
				transform="rotate(41.35)" />
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 120 120');
		return icon;
	}
	
	public makeSelectionIcon(): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
	
		// Draw a cursor-like shape
		icon.innerHTML = `
		<g>
			<rect x=10 y=10 width=70 height=70 fill='pink' stroke='black'/>
			<rect x=75 y=75 width=10 height=10 fill='white' stroke='black'/>
		</g>
		`;
		icon.setAttribute('viewBox', '0 0 100 100');
	
		return icon;
	}
	
	/**
	 * @param pathData - SVG path data (e.g. `m10,10l30,30z`)
	 * @param fill - A valid CSS color (e.g. `var(--icon-color)` or `#f0f`). This can be `none`.
	 */
	protected makeIconFromPath(
		pathData: string,
		fill: string = 'var(--icon-color)', 
		strokeColor: string = 'none',
		strokeWidth: string = '0px',
	): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		const path = document.createElementNS(svgNamespace, 'path');
		path.setAttribute('d', pathData);
		path.style.fill = fill;
		path.style.stroke = strokeColor;
		path.style.strokeWidth = strokeWidth;
		icon.appendChild(path);
		icon.setAttribute('viewBox', '0 0 100 100');
	
		return icon;
	}
	
	public makeHandToolIcon(): IconType {
		const fill = 'none';
		const strokeColor = 'var(--icon-color)';
		const strokeWidth = '3';
	
		// Draw a cursor-like shape
		return this.makeIconFromPath(`
			m 10,60
				5,30
			H 90
			V 30
			C 90,20 75,20 75,30
			V 60
				20
			C 75,10 60,10 60,20
			V 60
				15
			C 60,5 45,5 45,15
			V 60
				25
			C 45,15 30,15 30,25
			V 60
				75
			L 25,60
			C 20,45 10,50 10,60
			Z
		`, fill, strokeColor, strokeWidth);
	}
	
	public makeTouchPanningIcon(): IconType {
		const fill = 'none';
		const strokeColor = 'var(--icon-color)';
		const strokeWidth = '3';
	
		return this.makeIconFromPath(`
			M 5,5.5
			V 17.2
			L 16.25,5.46
			Z
	
			m 33.75,0
			L 50,17
			V 5.5
			Z
	
			M 5,40.7
			v 11.7
			h 11.25
			z
	
			M 26,19
			C 19.8,19.4 17.65,30.4 21.9,34.8
			L 50,70
			H 27.5
			c -11.25,0 -11.25,17.6 0,17.6
			H 61.25
			C 94.9,87.8 95,87.6 95,40.7 78.125,23 67,29 55.6,46.5
			L 33.1,23
			C 30.3125,20.128192 27.9,19 25.830078,19.119756
			Z
		`, fill, strokeColor, strokeWidth);
	}
	
	public makeAllDevicePanningIcon(): IconType {
		const fill = 'none';
		const strokeColor = 'var(--icon-color)';
		const strokeWidth = '3';
		return this.makeIconFromPath(`
			M 5 5
			L 5 17.5
				17.5 5
				5 5
			z
	
			M 42.5 5
			L 55 17.5
				55 5
				42.5 5
			z
	
			M 70 10
			L 70 21
				61 15
				55.5 23
				66 30
				56 37
				61 45
				70 39
				70 50
				80 50
				80 39
				89 45
				95 36
				84 30
				95 23
				89 15
				80 21
				80 10
				70 10
			z
	
			M 27.5 26.25
			L 27.5 91.25
			L 43.75 83.125
			L 52 99
			L 68 91
			L 60 75
			L 76.25 66.875
			L 27.5 26.25
			z
	
			M 5 42.5
			L 5 55
			L 17.5 55
			L 5 42.5
			z
		`, fill, strokeColor, strokeWidth);
	}
	
	public makeZoomIcon(): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.setAttribute('viewBox', '0 0 100 100');
	
		const addTextNode = (text: string, x: number, y: number) => {
			const textNode = document.createElementNS(svgNamespace, 'text');
			textNode.appendChild(document.createTextNode(text));
			textNode.setAttribute('x', x.toString());
			textNode.setAttribute('y', y.toString());
			textNode.style.textAlign = 'center';
			textNode.style.textAnchor = 'middle';
			textNode.style.fontSize = '55px';
			textNode.style.fill = 'var(--icon-color)';
			textNode.style.fontFamily = 'monospace';
	
			icon.appendChild(textNode);
		};
	
		addTextNode('+', 40, 45);
		addTextNode('-', 70, 75);
	
		return icon;
	}

	public makeRotationLockIcon(): IconType {
		const icon = this.makeIconFromPath(`
			M 40.1 25.1 
			C 32.5 25 27.9 34.1 27.9 34.1 
			L 25.7 30 
			L 28 44.7 
			L 36.6 40.3 
			L 32.3 38.3 
			C 33.6 28 38.1 25.2 45.1 31.8 
			L 49.4 29.6 
			C 45.9 26.3 42.8 25.1 40.1 25.1 
			z

			M 51.7 34.2 
			L 43.5 39.1 
			L 48 40.8 
			C 47.4 51.1 43.1 54.3 35.7 48.2 
			L 31.6 50.7 
			C 45.5 62.1 52.6 44.6 52.6 44.6 
			L 55.1 48.6 
			L 51.7 34.2 
			z

			M 56.9 49.9 
			C 49.8 49.9 49.2 57.3 49.3 60.9 
			L 47.6 60.9 
			L 47.6 73.7 
			L 66.1 73.7 
			L 66.1 60.9 
			L 64.4 60.9 
			C 64.5 57.3 63.9 49.9 56.9 49.9 
			z

			M 56.9 53.5 
			C 60.8 53.5 61 58.2 60.8 60.9 
			L 52.9 60.9 
			C 52.7 58.2 52.9 53.5 56.9 53.5 
			z
		`);

		icon.setAttribute('viewBox', '10 10 70 70');

		return icon;
	}

	public makeInsertImageIcon(): IconType {
		return this.makeIconFromPath(`
			M 5 10 L 5 90 L 95 90 L 95 10 L 5 10 z
			M 10 15 L 90 15 L 90 50 L 70 75 L 40 50 L 10 75 L 10 15 z
			M 22.5 25 A 7.5 7.5 0 0 0 15 32.5 A 7.5 7.5 0 0 0 22.5 40 A 7.5 7.5 0 0 0 30 32.5 A 7.5 7.5 0 0 0 22.5 25 z 
		`);
	}
	
	public makeTextIcon(textStyle: TextStyle): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.setAttribute('viewBox', '0 0 100 100');
	
		const textNode = document.createElementNS(svgNamespace, 'text');
		textNode.appendChild(document.createTextNode('T'));
	
		textNode.style.fontFamily = textStyle.fontFamily;
		textNode.style.fontWeight = textStyle.fontWeight ?? '';
		textNode.style.fontVariant = textStyle.fontVariant ?? '';
		textNode.style.fill = textStyle.renderingStyle.fill.toHexString();
	
		textNode.style.textAnchor = 'middle';
		textNode.setAttribute('x', '50');
		textNode.setAttribute('y', '75');
		textNode.style.fontSize = '65px';
		textNode.style.filter = 'drop-shadow(0px 0px 10px var(--primary-shadow-color))';
	
		icon.appendChild(textNode);
	
		return icon;
	}
	
	public makePenIcon(strokeSize: number, color: string|Color4, rounded?: boolean): IconType {
		if (color instanceof Color4) {
			color = color.toHexString();
		}
	
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.setAttribute('viewBox', '0 0 100 100');
		const tipThickness = strokeSize / 2;

		const inkTipPath = `
			M ${15 - tipThickness},${80 - tipThickness}
			  ${15 - tipThickness},${80 + tipThickness}
			  30,83
			  15,65
			Z
		`;
		const trailStartEndY = 80 + tipThickness;
		const inkTrailPath = `
			m ${15 - tipThickness * 1.1},${trailStartEndY}
			c 35,10 55,15 60,30
			l ${35 + tipThickness * 1.2},${-10 - tipThickness}
			C 80.47,98.32 50.5,${90 + tipThickness} 20,${trailStartEndY} Z
		`;

		const colorBubblePath = `
			M 72.45,35.67
			A 10,15 41.8 0 1 55,40.2 10,15 41.8 0 1 57.55,22.3 10,15 41.8 0 1 75,17.8 10,15 41.8 0 1 72.5,35.67
			Z
		`;

		let gripMainPath = 'M 85,-25 25,35 h 10 v 10 h 10 v 10 h 10 v 10 h 10 l -5,10 60,-60 z';
		let gripShadow1Path = 'M 25,35 H 35 L 90,-15 85,-25 Z';
		let gripShadow2Path = 'M 60,75 65,65 H 55 l 55,-55 10,5 z';

		if (rounded) {
			gripMainPath = 'M 85,-25 25,35 c 15,0 40,30 35,40 l 60,-60 z';
			gripShadow1Path = 'm 25,35 c 3.92361,0.384473 7.644275,0.980572 10,3 l 55,-53 -5,-10 z';
			gripShadow2Path = 'M 60,75 C 61,66 59,65 56,59 l 54,-54 10,10 z';
		}

		const penTipPath = `M 25,35 ${10 - tipThickness / 4},${70 - tipThickness / 2} 20,75 25,85 60,75 70,55 45,25 Z`;

		const pencilTipColor = Color4.fromHex('#f4d7d7');
		const tipColor = pencilTipColor.mix(
			Color4.fromString(color), tipThickness / 40 - 0.1
		).toHexString();

		const ink = `
			<path
				fill="${checkerboardPatternRef}"
				d="${inkTipPath}"
			/>
			<path
				fill="${checkerboardPatternRef}"
				d="${inkTrailPath}"
			/>
			<path
				fill="${color}"
				d="${inkTipPath}"
			/>
			<path
				fill="${color}"
				d="${inkTrailPath}"
			/>
		`;

		const penTip = `
			<path
				fill="${checkerboardPatternRef}"
				d="${penTipPath}"
			/>
			<path
				fill="${tipColor}"
				stroke="${color}"
				d="${penTipPath}"
			/>
		`;

		const grip = `
			<path
				${iconColorStrokeFill}
				d="${gripMainPath}"
			/>

			<!-- shadows -->
			<path
				fill="rgba(150, 150, 150, 0.3)"
				d="${gripShadow1Path}"
			/>
			<path
				fill="rgba(100, 100, 100, 0.2)"
				d="${gripShadow2Path}"
			/>

			<!-- color bubble -->
			<path
				fill="${checkerboardPatternRef}"
				d="${colorBubblePath}"
			/>
			<path
				fill="${color}"
				d="${colorBubblePath}"
			/>
		`;

		icon.innerHTML = `
		<defs>
			${checkerboardPatternDef}
		</defs>
		<g>
			${ink}
			${penTip}
			${grip}
		</g>
		`;
		return icon;
	}
	
	public makeIconFromFactory(pen: Pen, factory: ComponentBuilderFactory): IconType {
		// Increase the thickness we use to generate the icon less with larger actual thicknesses.
		// We want the icon to be recognisable with a large range of thicknesses.
		const thickness = Math.sqrt(pen.getThickness()) * 3;
	
		const nowTime = (new Date()).getTime();
		const startPoint: StrokeDataPoint = {
			pos: Vec2.of(10, 10),
			width: thickness,
			color: pen.getColor(),
			time: nowTime - 100,
		};
		const endPoint: StrokeDataPoint = {
			pos: Vec2.of(90, 90),
			width: thickness,
			color: pen.getColor(),
			time: nowTime,
		};
	
		const viewport = new Viewport(() => {});
		const builder = factory(startPoint, viewport);
		builder.addPoint(endPoint);
	
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.setAttribute('viewBox', '0 0 100 100');
		viewport.updateScreenSize(Vec2.of(100, 100));
	
		const renderer = new SVGRenderer(icon, viewport);
		builder.preview(renderer);
	
		return icon;
	}
	
	public makePipetteIcon(color?: Color4): IconType {
		const icon = document.createElementNS(svgNamespace, 'svg');
		const pipette = document.createElementNS(svgNamespace, 'path');
	
		pipette.setAttribute('d', `
			M 47,6
			C 35,5 25,15 35,30
			c -9.2,1.3 -15,0 -15,3
				0,2 5,5 15,7
			V 81
			L 40,90
			h 6
			L 40,80
			V 40
			h 15
			v 40
			l -6,10
			h 6
			l 5,-9.2
			V 40
			C 70,38 75,35 75,33
				75,30 69.2,31.2 60,30
				65,15 65,5      47,6
			Z
		`);
		pipette.style.fill = 'var(--icon-color)';
	
		if (color) {
			const defs = document.createElementNS(svgNamespace, 'defs');
			defs.innerHTML = checkerboardPatternDef;
			icon.appendChild(defs);
	
			const fluidBackground = document.createElementNS(svgNamespace, 'path');
			const fluid = document.createElementNS(svgNamespace, 'path');
	
			const fluidPathData = `
				m 40,50 c 5,5 10,0 15,-5 V 80 L 50,90 H 45 L 40,80 Z
			`;
	
			fluid.setAttribute('d', fluidPathData);
			fluidBackground.setAttribute('d', fluidPathData);
	
			fluid.style.fill = color.toHexString();
			fluidBackground.style.fill = checkerboardPatternRef;
	
			icon.appendChild(fluidBackground);
			icon.appendChild(fluid);
		}
		icon.appendChild(pipette);
	
		icon.setAttribute('viewBox', '0 0 100 100');
		return icon;
	}

	public makeFormatSelectionIcon(): IconType {
		return this.makeIconFromPath(`
			M 5 10
			L 5 20 L 10 20 L 10 15 L 20 15 L 20 40 L 15 40 L 15 45 L 35 45 L 35 40 L 30 40 L 30 15 L 40 15 L 40 20 L 45 20 L 45 15 L 45 10 L 5 10 z
			M 90 10 C 90 10 86.5 13.8 86 14 C 86 14 76.2 24.8 76 25 L 60 25 L 60 65 C 75 70 85 70 90 65 L 90 25 L 80 25 L 76.7 25 L 90 10 z
			M 60 25 L 55 25 L 50 30 L 60 25 z
			M 10 55 L 10 90 L 41 90 L 41 86 L 45 86 L 45 55 L 10 55 z
			M 42 87 L 42 93 L 48 93 L 48 87 L 42 87 z 
		`);
	}
	
	public makeResizeViewportIcon(): IconType {
		return this.makeIconFromPath(`
			M 75 5 75 10 90 10 90 25 95 25 95 5 75 5 z
			M 15 15 15 30 20 30 20 20 30 20 30 15 15 15 z
			M 84 15 82 17 81 16 81 20 85 20 84 19 86 17 84 15 z
			M 26 24 24 26 26 28 25 29 29 29 29 25 28 26 26 24 z
			M 25 71 26 72 24 74 26 76 28 74 29 75 29 71 25 71 z
			M 15 75 15 85 25 85 25 80 20 80 20 75 15 75 z
			M 90 75 90 90 75 90 75 95 95 95 95 75 90 75 z
			M 81 81 81 85 82 84 84 86 86 84 84 82 85 81 81 81 z
		`);
	}
	
	public makeDuplicateSelectionIcon(): IconType {
		return this.makeIconFromPath(`
			M 45,10 45,55 90,55 90,10 45,10 z
			M 10,25 10,90 70,90 70,60 40,60 40,25 10,25 z 
		`);
	}

	public makePasteIcon(): IconType {
		const icon = this.makeIconFromPath(`
			M 50 0 L 50 5 L 35 5 L 40 24.75 L 20 25 L 20 100 L 85 100 L 100 90 L 100 24 L 75.1 24.3 L 80 5 L 65 5 L 65 0 L 50 0 z
			M 10 15 L 10 115 L 110 115 L 110 15 L 85 15 L 83 20 L 105 20 L 105 110 L 15 110 L 15 20 L 32 20 L 30 15 L 10 15 z
			M 25 35 L 90 35 L 90 40 L 25 40 L 25 35 z
			M 25 45 L 90 45 L 90 50 L 25 50 L 25 45 z
			M 25 55 L 85 55 L 85 60 L 25 60 L 25 55 z
			M 25 65 L 90 65 L 90 70 L 25 70 L 25 65 z 
		`);
		icon.setAttribute('viewBox', '0 0 120 120');
		return icon;
	}
	
	public makeDeleteSelectionIcon(): IconType {
		const strokeWidth = '5px';
		const strokeColor = 'var(--icon-color)';
		const fillColor = 'none';
	
		return this.makeIconFromPath(`
			M 10,10 90,90
			M 10,90 90,10
		`, fillColor, strokeColor, strokeWidth);
	}

	public makeSaveIcon(): IconType {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.innerHTML = `
			<style>
				.toolbar-save-icon {
					stroke: var(--icon-color);
					stroke-width: 10;
					stroke-linejoin: round;
					stroke-linecap: round;
					fill: none;
				}
			</style>
			<path
				d='
					M 15,55 30,70 85,20
				'
				class='toolbar-save-icon'
			/>
		`;
		svg.setAttribute('viewBox', '0 0 100 100');
		return svg;
	}

	public makeConfigureDocumentIcon(): IconType {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.innerHTML = `
			<path
				d='
					M 5,5 V 95 H 95 V 5 Z m 5,5 H 90 V 90 H 10 Z
					m 5,10 V 30 H 50 V 25 H 20 v -5 z
					m 40,0 V 50 H 85 V 20 Z
					m 2,2 H 83 V 39 L 77,28 70,42 64,35 57,45 Z
					m 8.5,5 C 64.67,27 64,27.67 64,28.5 64,29.33 64.67,30 65.5,30 66.33,30 67,29.33 67,28.5 67,27.67 66.33,27 65.5,27 Z
					M 15,40 v 5 h 35 v -5 z
					m 0,15 v 5 h 70 v -5 z
					m 0,15 v 5 h 70 v -5 z
				'
				style='fill: var(--icon-color);'
			/>
		`;
		svg.setAttribute('viewBox', '0 0 100 100');
		return svg;
	}

	public makeOverflowIcon(): IconType {
		return this.makeIconFromPath(`
			M 15 40
			A 12.5 12.5 0 0 0 2.5 52.5
			A 12.5 12.5 0 0 0 15 65
			A 12.5 12.5 0 0 0 27.5 52.5
			A 12.5 12.5 0 0 0 15 40
			z
	
			M 50 40
			A 12.5 12.5 0 0 0 37.5 52.5
			A 12.5 12.5 0 0 0 50 65
			A 12.5 12.5 0 0 0 62.5 52.5
			A 12.5 12.5 0 0 0 50 40
			z
			
			M 85 40
			A 12.5 12.5 0 0 0 72.5 52.5
			A 12.5 12.5 0 0 0 85 65
			A 12.5 12.5 0 0 0 97.5 52.5
			A 12.5 12.5 0 0 0 85 40
			z
		`);
	}
	
}
