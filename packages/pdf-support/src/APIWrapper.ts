import { Color4, Point2, Rect2 } from 'js-draw';

export enum AnnotationType {
	Link = 'Link',
	Ink = 'Ink',
	FreeText = 'FreeText',
	Text = 'Text',
	Square = 'Square',
	Circle = 'Circle',
	Polygon = 'Polygon',
	Line = 'Line',
	PolyLine = 'PolyLine',
	Highlight = 'Highlight',
	Underline = 'Underline',
	Squiggly = 'Squiggly',
	StrikeOut = 'StrikeOut',
	Redact = 'Redact',
	Stamp = 'Stamp',
	Caret = 'Caret',
	FileAttachment = 'FileAttachment',
}

export interface TextContentsType {
	readonly direction: 'ltr'|'rtl';
	readonly text: string;
}

export interface FontAppearance {
	readonly size: number;
	readonly family: string;
	readonly color: Color4;
}

export interface AnnotationAPIWrapper {
	readonly type: AnnotationType;
	readonly bbox: Rect2;
	readonly inkList: Point2[][];
	readonly color: Color4|undefined;
	readonly borderWidth: number;
	readonly rotate: number;
	readonly contents: TextContentsType|undefined;
	readonly fontAppearance: FontAppearance|undefined;
	readonly id: string|undefined;
}

export interface PageAPIWrapper {
	getBBox(): Promise<Rect2>;
	toImagelike(visibleRect: Rect2, scale: number, showAnnotations: boolean): Promise<ImageBitmap|HTMLImageElement|HTMLCanvasElement|OffscreenCanvas>;
	getAnnotations(): Promise<AnnotationAPIWrapper[]>;

	/**
	 * Replace annotations in the document with the same `id` as an annotation in
	 * `annotations`.
	 */
	replaceAnnotations(annotations: AnnotationAPIWrapper[]): Promise<void>;
}

export interface APIWrapper {
	pageCount(): number;
	loadPage(idx: number): Promise<PageAPIWrapper>;
}

export default APIWrapper;
