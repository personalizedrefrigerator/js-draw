import { IconSpec } from '../specification/icon';

export type IconElement = HTMLImageElement|SVGElement;

export interface IconTheme {
	renderIcon(icon: IconSpec): IconElement;
}

