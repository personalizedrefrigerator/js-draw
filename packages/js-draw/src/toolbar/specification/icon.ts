import type { TextRenderingStyle } from '../../rendering/TextRenderingStyle';
import type { PenStyle } from '../../tools/Pen';

export enum IconType {
	Undo = 'undo',
	Redo = 'redo',

	Eraser = 'eraser',
	Selection = 'selection',
	HandTool = 'hand',
	TextTool = 'text',
	PenTool = 'pen',
	Pipette = 'pipette',
	ImageTool = 'image',

	RotationLock = 'rotation-lock',

	CustomIcon = 'custom',
}

// @internal
interface SimpleIconSpec {
	// Exclude all icon types that must/may include additional information.
	kind: Exclude<IconType, IconType.Eraser|IconType.PenTool|IconType.TextTool|IconType.CustomIcon>;
}

interface EraserIconSpec {
	kind: IconType.Eraser;

	eraserThickness?: number;
}

interface PenIconSpec {
	kind: IconType.PenTool;

	penStyle?: PenStyle;
}

interface TextIconSpec {
	kind: IconType.TextTool;

	textStyle?: TextRenderingStyle;
}

interface CustomIconSpec {
	kind: IconType.CustomIcon;

	name: string;

	/**
	 * `fallback` is a reference to an IconSpec that will be
	 * used if no custom icon with `name` is supported by the
	 * icon renderer. `fallback` must not self-reference.
	 */
	fallback: IconSpec;
}

export type IconSpec = SimpleIconSpec|EraserIconSpec|PenIconSpec|TextIconSpec|CustomIconSpec;
