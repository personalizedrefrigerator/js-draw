import { AnnotationType } from '@js-draw/pdf-support';

export type ColorArray = [number] | [number, number, number] | [number, number, number, number];

export interface TransferrableAnnotation {
	type: AnnotationType;
	bbox: { x: number; y: number; w: number; h: number };
	inkList: [number, number][][];
	color: ColorArray | undefined;
	opacity: number;
	borderWidth: number;
	rotate: number;
	contents: { text: string; direction: 'ltr' | 'rtl' } | undefined;
	fontAppearance:
		| {
				size: number;
				color: ColorArray;
				family: string;
		  }
		| undefined;
	id: string | undefined;
}
