import { AnnotationType } from '@js-draw/pdf-support';

export interface TransferrableAnnotation {
	type: AnnotationType;
	bbox: { x: number, y: number, w: number, h: number };
	inkList: [number, number][][];
	color: number[]|undefined;
	opacity: number;
	borderWidth: number;
	rotate: number;
	contents: { text: string, direction: 'ltr'|'rtl' }|undefined;
	fontAppearance: {
		size: number;
		color: number[];
		family: string;
	}|undefined;
	id: string|undefined;
}
