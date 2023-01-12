import Color4 from '../Color4';
import { ComponentBuilderFactory } from '../components/builders/types';
import { TextStyle } from '../components/TextComponent';
import EventDispatcher from '../EventDispatcher';
import { Vec2 } from '../math/Vec2';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import Pen from '../tools/Pen';
import { StrokeDataPoint } from '../types';
import Viewport from '../Viewport';

// Provides a default set of icons for the editor.
// Many of the icons were created with Inkscape.

type IconType = SVGSVGElement|HTMLImageElement;

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

// Provides icons that can be used in the toolbar, etc.
// Extend this class and override methods to customize icons.
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
	
	public makePenIcon(tipThickness: number, color: string|Color4, roundedTip?: boolean): IconType {
		if (color instanceof Color4) {
			color = color.toHexString();
		}
	
		const icon = document.createElementNS(svgNamespace, 'svg');
		icon.setAttribute('viewBox', '0 0 100 100');
	
		const halfThickness = tipThickness / 2;
	
		// Draw a pen-like shape
		const penTipLeft = 50 - halfThickness;
		const penTipRight = 50 + halfThickness;

		let tipCenterPrimaryPath = `L${penTipLeft},95 L${penTipRight},90`;
		let tipCenterBackgroundPath = `L${penTipLeft},85 L${penTipRight},83`;

		if (roundedTip) {
			tipCenterPrimaryPath = `L${penTipLeft},95 q${halfThickness},10 ${2 * halfThickness},-5`;
			tipCenterBackgroundPath = `L${penTipLeft},87 q${halfThickness},10 ${2 * halfThickness},-3`;
		}

		const primaryStrokeTipPath = `M14,63 ${tipCenterPrimaryPath} L88,60 Z`;
		const backgroundStrokeTipPath = `M14,63 ${tipCenterBackgroundPath} L88,60 Z`;

		icon.innerHTML = `
		<defs>
			${checkerboardPatternDef}
		</defs>
		<g>
			<!-- Pen grip -->
			<path
				d='M10,10 L90,10 L90,60 L${50 + halfThickness},80 L${50 - halfThickness},80 L10,60 Z'
				${iconColorStrokeFill}
			/>
		</g>
		<g>
			<!-- Checkerboard background for slightly transparent pens -->
			<path d='${backgroundStrokeTipPath}' fill='${checkerboardPatternRef}'/>
	
			<!-- Actual pen tip -->
			<path
				d='${primaryStrokeTipPath}'
				fill='${color}'
				stroke='${color}'
			/>
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
	
		const viewport = new Viewport(new EventDispatcher());
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
	
}
