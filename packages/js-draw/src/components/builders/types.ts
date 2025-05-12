import { Rect2 } from '@js-draw/math';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';
import { StrokeStyle } from '../../rendering/RenderingStyle';

export interface ComponentBuilder {
	getBBox(): Rect2;
	build(): AbstractComponent;
	preview(renderer: AbstractRenderer): void;

	/**
	 * (Optional) If provided, allows js-draw to efficiently render
	 * an ink trail with the given style on some devices.
	 */
	inkTrailStyle?: () => StrokeStyle;

	/**
	 * Called when the pen is stationary (or the user otherwise
	 * activates autocomplete). This might attempt to fit the user's
	 * drawing to a particular shape.
	 *
	 * The shape returned by this function may be ignored if it has
	 * an empty bounding box.
	 *
	 * Although this returns a Promise, it should return *as fast as
	 * possible*.
	 */
	autocorrectShape?: () => Promise<AbstractComponent | null>;

	addPoint(point: StrokeDataPoint): void;
}

export type ComponentBuilderFactory = (
	startPoint: StrokeDataPoint,
	viewport: Viewport,
) => ComponentBuilder;
