import Command from './commands/Command';
import { CommandLocalization } from './commands/localization';
import Editor from './Editor';
import { Mat33, Rect2, Point2, Vec2, Vec3 } from '@js-draw/math';
import { StrokeDataPoint } from './types';
import describeTransformation from './util/describeTransformation';

// Returns the base type of some type of point/number
type PointDataType<T extends Point2 | StrokeDataPoint | number> = T extends Point2
	? Point2
	: number;

export abstract class ViewportTransform extends Command {
	public abstract readonly transform: Mat33;
}

type TransformChangeCallback = (oldTransform: Mat33, newTransform: Mat33) => void;

export class Viewport {
	// Command that translates/scales the viewport.
	private static ViewportTransform = class extends ViewportTransform {
		readonly #inverseTransform: Mat33;

		public constructor(public readonly transform: Mat33) {
			super();
			this.#inverseTransform = transform.inverse();
		}

		public apply(editor: Editor) {
			const viewport = editor.viewport;
			viewport.resetTransform(viewport.transform.rightMul(this.transform));
			editor.queueRerender();
		}

		public unapply(editor: Editor) {
			const viewport = editor.viewport;
			viewport.resetTransform(viewport.transform.rightMul(this.#inverseTransform));
			editor.queueRerender();
		}

		public description(editor: Editor, localizationTable: CommandLocalization): string {
			return describeTransformation(
				editor.viewport.visibleRect.center,
				this.transform,
				true,
				localizationTable,
			);
		}
	};

	/** Converts from canvas to screen coordinates */
	private transform: Mat33;
	/** Converts from screen to canvas coordinates */
	private inverseTransform: Mat33;
	private screenRect: Rect2;

	// @internal
	public constructor(private onTransformChangeCallback: TransformChangeCallback) {
		this.resetTransform(Mat33.identity);
		this.screenRect = Rect2.empty;
	}

	/**
	 * @returns a temporary copy of `this` that does not notify when modified. This is
	 * useful when rendering with a temporarily different viewport.
	 */
	public getTemporaryClone(): Viewport {
		const result = new Viewport(() => {});
		result.transform = this.transform;
		result.inverseTransform = this.inverseTransform;
		result.screenRect = this.screenRect;

		return result;
	}

	/** Resizes the screen rect to the given size. @internal */
	public updateScreenSize(screenSize: Vec2) {
		this.screenRect = this.screenRect.resizedTo(screenSize);
	}

	/** Get the screen's visible region transformed into canvas space. */
	public get visibleRect(): Rect2 {
		return this.screenRect.transformedBoundingBox(this.inverseTransform);
	}

	/** @returns the given point, but in canvas coordinates */
	public screenToCanvas(screenPoint: Point2): Point2 {
		return this.inverseTransform.transformVec2(screenPoint);
	}

	/** @returns the given point transformed into screen coordinates. */
	public canvasToScreen(canvasPoint: Point2): Point2 {
		return this.transform.transformVec2(canvasPoint);
	}

	/**
	 * @returns a command that transforms the canvas by `transform`.
	 *
	 * For example, `Viewport.transformBy(moveRight).apply(editor)` would move the canvas to the right
	 * (and thus the viewport to the left):
	 * ```ts,runnable
	 * import { Editor, Viewport, Mat33, Vec2 } from 'js-draw';
	 * const editor = new Editor(document.body);
	 * const moveRight = Mat33.translation(Vec2.unitX.times(500));
	 * // Move the **canvas** right by 500 units:
	 * Viewport.transformBy(moveRight).apply(editor);
	 * ```
	 */
	public static transformBy(transform: Mat33): ViewportTransform {
		return new Viewport.ViewportTransform(transform);
	}

	/**
	 * Updates the canvas-to-screen transformation directly. Using `transformBy` is preferred.
	 * @param newTransform - should map from canvas coordinates to screen coordinates.
	 */
	public resetTransform(newTransform: Mat33 = Mat33.identity) {
		const oldTransform = this.transform;
		this.transform = newTransform;
		this.inverseTransform = newTransform.inverse();
		this.onTransformChangeCallback?.(oldTransform, newTransform);
	}

	public get screenToCanvasTransform(): Mat33 {
		return this.inverseTransform;
	}

	public get canvasToScreenTransform(): Mat33 {
		return this.transform;
	}

	/** @returns the size of the visible region in pixels (screen units). */
	public getScreenRectSize(): Vec2 {
		return this.screenRect.size;
	}

	/** Alias for `getScreenRectSize`. @deprecated */
	public getResolution() {
		return this.getScreenRectSize();
	}

	/** @returns the amount a vector on the canvas is scaled to become a vector on the screen. */
	public getScaleFactor(): number {
		// Use transformVec3 to avoid translating the vector
		return this.transform.transformVec3(Vec3.unitX).magnitude();
	}

	/**
	 * @returns `getScaleFactor()` rounded to the nearest power of 10.
	 * For example, if `getScaleFactor()` returns 101, `getScaleFactorToNearestPowerOfTen()`
	 * should return `100` because `100` is the nearest power of 10 to 101.
	 */
	public getScaleFactorToNearestPowerOfTen() {
		return this.getScaleFactorToNearestPowerOf(10);
	}

	private getScaleFactorToNearestPowerOf(powerOf: number) {
		const scaleFactor = this.getScaleFactor();
		return Math.pow(powerOf, Math.round(Math.log(scaleFactor) / Math.log(powerOf)));
	}

	/** Returns the size of a grid cell (in canvas units) as used by {@link snapToGrid}. */
	public static getGridSize(scaleFactor: number) {
		return 50 / scaleFactor;
	}

	/**
	 * Snaps `canvasPos` to the nearest grid cell corner.
	 *
	 * @see {@link getGridSize}.
	 */
	public snapToGrid(canvasPos: Point2) {
		const scaleFactor = this.getScaleFactorToNearestPowerOf(2);

		const snapCoordinate = (coordinate: number) => {
			const roundFactor = 1 / Viewport.getGridSize(scaleFactor);
			const snapped = Math.round(coordinate * roundFactor) / roundFactor;

			return snapped;
		};

		const snappedCanvasPos = Vec2.of(snapCoordinate(canvasPos.x), snapCoordinate(canvasPos.y));
		return snappedCanvasPos;
	}

	/** Returns the size of one screen pixel in canvas units. */
	public getSizeOfPixelOnCanvas(): number {
		return 1 / this.getScaleFactor();
	}

	/**
	 * @returns the angle of the canvas in radians.
	 * This is the angle by which the canvas is rotated relative to the screen.
	 *
	 * Returns an angle in the range $[-\pi, \pi]$ (the same range as {@link Vec3.angle}).
	 */
	public getRotationAngle(): number {
		return this.transform.transformVec3(Vec3.unitX).angle();
	}

	/**
	 * Rounds the given `point` to a multiple of 10 such that it is within `tolerance` of
	 * its original location. This is useful for preparing data for base-10 conversion.
	 */
	public static roundPoint<T extends Point2 | number>(
		point: T,
		tolerance: number,
	): PointDataType<T>;

	// The separate function type definition seems necessary here.
	// See https://stackoverflow.com/a/58163623/17055750.
	public static roundPoint(point: Point2 | number, tolerance: number): Point2 | number {
		const scaleFactor = 10 ** Math.floor(Math.log10(tolerance));
		const roundComponent = (component: number): number => {
			return Math.round(component / scaleFactor) * scaleFactor;
		};

		if (typeof point === 'number') {
			return roundComponent(point);
		}

		return point.map(roundComponent);
	}

	/** Round a point with a tolerance of ±1 screen unit. */
	public roundPoint(point: Point2): Point2 {
		return Viewport.roundPoint(point, 1 / this.getScaleFactor());
	}

	// `roundAmount`: An integer >= 0, larger numbers cause less rounding. Smaller numbers cause more
	// (as such `roundAmount = 0` does the most rounding).
	public static roundScaleRatio(scaleRatio: number, roundAmount: number = 1): number {
		if (Math.abs(scaleRatio) <= 1e-12) {
			return 0;
		}

		// Represent as k 10ⁿ for some n, k ∈ ℤ.
		const decimalComponent = 10 ** Math.floor(Math.log10(Math.abs(scaleRatio)));
		const roundAmountFactor = 2 ** roundAmount;
		scaleRatio =
			(Math.round((scaleRatio / decimalComponent) * roundAmountFactor) / roundAmountFactor) *
			decimalComponent;

		return scaleRatio;
	}

	// Computes and returns an affine transformation that makes `toMakeVisible` visible and roughly centered on the screen.
	public computeZoomToTransform(
		toMakeVisible: Rect2,
		allowZoomIn: boolean = true,
		allowZoomOut: boolean = true,
	): Mat33 {
		let transform = Mat33.identity;

		// Invalid size? (Would divide by zero)
		if (toMakeVisible.w === 0 || toMakeVisible.h === 0) {
			// Create a new rectangle with a valid size
			let newSize = Math.max(toMakeVisible.w, toMakeVisible.h);

			// Choose a reasonable default size, but don't zoom.
			if (newSize === 0) {
				newSize = 50;
				allowZoomIn = false;
				allowZoomOut = false;
			}

			toMakeVisible = new Rect2(toMakeVisible.x, toMakeVisible.y, newSize, newSize);
		}

		if (isNaN(toMakeVisible.size.magnitude())) {
			throw new Error(`${toMakeVisible.toString()} rectangle has NaN size! Cannot zoom to!`);
		}

		// Try to move the selection within the center 4/5ths of the viewport.
		const recomputeTargetRect = () => {
			// transform transforms objects on the canvas. As such, we need to invert it
			// to transform the viewport.
			const visibleRect = this.visibleRect.transformedBoundingBox(transform.inverse());
			return visibleRect.transformedBoundingBox(Mat33.scaling2D(4 / 5, visibleRect.center));
		};

		let targetRect = recomputeTargetRect();
		const largerThanTarget = targetRect.w < toMakeVisible.w || targetRect.h < toMakeVisible.h;

		// Ensure that toMakeVisible is at least 1/3rd of the visible region.
		const muchSmallerThanTarget = toMakeVisible.maxDimension / targetRect.maxDimension < 1 / 3;

		if ((largerThanTarget && allowZoomOut) || (muchSmallerThanTarget && allowZoomIn)) {
			const multiplier = Math.max(toMakeVisible.w / targetRect.w, toMakeVisible.h / targetRect.h);
			const visibleRectTransform = Mat33.scaling2D(multiplier, targetRect.topLeft);
			const viewportContentTransform = visibleRectTransform.inverse();

			transform = transform.rightMul(viewportContentTransform);
		}

		targetRect = recomputeTargetRect();

		// Ensure that the center of the region is visible
		if (!targetRect.containsRect(toMakeVisible)) {
			// target position - current position
			const translation = toMakeVisible.center.minus(targetRect.center);
			const visibleRectTransform = Mat33.translation(translation);
			const viewportContentTransform = visibleRectTransform.inverse();

			transform = transform.rightMul(viewportContentTransform);
		}

		if (!transform.invertable()) {
			console.warn(
				'Unable to zoom to ',
				toMakeVisible,
				'! Computed transform',
				transform,
				'is singular.',
			);
			transform = Mat33.identity;
		}

		return transform;
	}

	// Returns a Command that transforms the view such that `toMakeVisible` is visible, and perhaps
	// centered in the viewport.
	//
	// If the content is already roughly centered in the screen and at a reasonable zoom level,
	// the resultant command does nothing.
	//
	// @see {@link computeZoomToTransform}
	public zoomTo(
		toMakeVisible: Rect2,
		allowZoomIn: boolean = true,
		allowZoomOut: boolean = true,
	): Command {
		const transform = this.computeZoomToTransform(toMakeVisible, allowZoomIn, allowZoomOut);
		return new Viewport.ViewportTransform(transform);
	}
}

export default Viewport;
