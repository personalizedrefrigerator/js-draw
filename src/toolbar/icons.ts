import Color4 from '../Color4';
import { ComponentBuilderFactory } from '../components/builders/types';
import { TextStyle } from '../components/Text';
import EventDispatcher from '../EventDispatcher';
import { Vec2 } from '../geometry/Vec2';
import SVGRenderer from '../rendering/renderers/SVGRenderer';
import Pen from '../tools/Pen';
import { StrokeDataPoint } from '../types';
import Viewport from '../Viewport';

const svgNamespace = 'http://www.w3.org/2000/svg';
const primaryForegroundFill = `
	style='fill: var(--primary-foreground-color);'
`;
const primaryForegroundStrokeFill = `
	style='fill: var(--primary-foreground-color); stroke: var(--primary-foreground-color);'
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

export const makeUndoIcon = () => {
	return makeRedoIcon(true);
};

export const makeRedoIcon = (mirror: boolean = false) => {
	const icon = document.createElementNS(svgNamespace, 'svg');
	icon.innerHTML = `
		<style>
			.toolbar-svg-undo-redo-icon {
				stroke: var(--primary-foreground-color);
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
};

export const makeDropdownIcon = () => {
	const icon = document.createElementNS(svgNamespace, 'svg');
	icon.innerHTML = `
	<g>
		<path
			d='M5,10 L50,90 L95,10 Z'
			${primaryForegroundFill}
		/>
	</g>
	`;
	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

export const makeEraserIcon = () => {
	const icon = document.createElementNS(svgNamespace, 'svg');

	// Draw an eraser-like shape
	icon.innerHTML = `
	<g>
		<rect x=10 y=50 width=80 height=30 rx=10 fill='pink' />
		<rect
			x=10 y=10 width=80 height=50
			${primaryForegroundFill}
		/>
	</g>
	`;
	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

export const makeSelectionIcon = () => {
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
};

export const makeHandToolIcon = () => {
	const icon = document.createElementNS(svgNamespace, 'svg');

	// Draw a cursor-like shape (like some of the other icons, made with Inkscape)
	icon.innerHTML = `
	<g>
		<path d='
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
			Z'
			
			fill='none'
			style='
				stroke: var(--primary-foreground-color);
				stroke-width: 2;
			'
		/>
	</g>
	`;
	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

export const makeTouchPanningIcon = () => {
	const icon = document.createElementNS(svgNamespace, 'svg');
	icon.innerHTML = `
		<path
			d='
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
			'
			fill='none'
			style='
				stroke: var(--primary-foreground-color);
				stroke-width: 2;
			'
		/>
	`;

	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

export const makeAllDevicePanningIcon = () => {
	const icon = document.createElementNS(svgNamespace, 'svg');
	icon.innerHTML = `
		<path
			d='
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
			'
			fill='none'
			style='
				stroke: var(--primary-foreground-color);
				stroke-width: 2;
			'
		/>
	`;

	icon.setAttribute('viewBox', '0 0 100 100');
	return icon;
};

export const makeZoomIcon = () => {
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
		textNode.style.fill = 'var(--primary-foreground-color)';
		textNode.style.fontFamily = 'monospace';

		icon.appendChild(textNode);
	};

	addTextNode('+', 40, 45);
	addTextNode('-', 70, 75);

	return icon;
};

export const makeTextIcon = (textStyle: TextStyle) => {
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
};

export const makePenIcon = (tipThickness: number, color: string) => {
	const icon = document.createElementNS(svgNamespace, 'svg');
	icon.setAttribute('viewBox', '0 0 100 100');

	const halfThickness = tipThickness / 2;

	// Draw a pen-like shape
	const primaryStrokeTipPath = `M14,63 L${50 - halfThickness},95 L${50 + halfThickness},90 L88,60 Z`;
	const backgroundStrokeTipPath = `M14,63 L${50 - halfThickness},85 L${50 + halfThickness},83 L88,60 Z`;
	icon.innerHTML = `
	<defs>
		${checkerboardPatternDef}
	</defs>
	<g>
		<!-- Pen grip -->
		<path
			d='M10,10 L90,10 L90,60 L${50 + halfThickness},80 L${50 - halfThickness},80 L10,60 Z'
			${primaryForegroundStrokeFill}
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
};

export const makeIconFromFactory = (pen: Pen, factory: ComponentBuilderFactory) => {
	const toolThickness = pen.getThickness();

	const nowTime = (new Date()).getTime();
	const startPoint: StrokeDataPoint = {
		pos: Vec2.of(10, 10),
		width: toolThickness / 5,
		color: pen.getColor(),
		time: nowTime - 100,
	};
	const endPoint: StrokeDataPoint = {
		pos: Vec2.of(90, 90),
		width: toolThickness / 5,
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
};

export const makePipetteIcon = (color?: Color4) => {
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
	pipette.style.fill = 'var(--primary-foreground-color)';

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
};
