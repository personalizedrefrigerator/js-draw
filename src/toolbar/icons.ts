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

	// Draw a cursor-like shape
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
		<path d='${backgroundStrokeTipPath}' fill='url(#checkerboard)'/>

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
