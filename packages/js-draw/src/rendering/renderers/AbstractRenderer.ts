import { Color4, Mat33, Point2, Vec2, Rect2, Path, PathCommandType } from '@js-draw/math';
import { LoadSaveDataTable } from '../../components/AbstractComponent';
import Viewport from '../../Viewport';
import RenderingStyle, { stylesEqual } from '../RenderingStyle';
import TextRenderingStyle from '../TextRenderingStyle';
import RenderablePathSpec, { pathToRenderable } from '../RenderablePathSpec';

export interface RenderableImage {
	transform: Mat33;

	// An Image or HTMLCanvasElement. If an Image, it must be loaded from the same origin as this
	// (and should have `src=this.base64Url`).
	//
	// **Note:** In the future, `image` may also have type `ImageBitmap`, which **does not** support
	// `.getAttribute` as it is not an `HTMLElement`.
	image: HTMLImageElement|HTMLCanvasElement;

	// All images that can be drawn **must** have a base64 URL in the form
	// data:image/[format];base64,[data here]
	// If `image` is an Image, this should be equivalent to `image.src`.
	base64Url: string;

	label?: string;
}

/**
 * Abstract base class for renderers.
 *
 * @see {@link EditorImage.render}
 */
export default abstract class AbstractRenderer {
	// If null, this' transformation is linked to the Viewport
	private selfTransform: Mat33|null = null;
	private transformStack: Array<Mat33|null> = [];

	protected constructor(private viewport: Viewport) { }

	/**
	 * this.canvasToScreen, etc. should be used instead of the corresponding
	 * methods on `Viewport`, because the viewport may not accurately reflect
	 * what is rendered.
	 */
	protected getViewport(): Viewport { return this.viewport; }

	// Returns the size of the rendered region of this on
	// the display (in pixels).
	public abstract displaySize(): Vec2;

	public abstract clear(): void;
	protected abstract beginPath(startPoint: Point2): void;
	protected abstract endPath(style: RenderingStyle): void;
	protected abstract lineTo(point: Point2): void;
	protected abstract moveTo(point: Point2): void;
	protected abstract traceCubicBezierCurve(
		p1: Point2, p2: Point2, p3: Point2,
	): void;
	protected abstract traceQuadraticBezierCurve(
		controlPoint: Point2, endPoint: Point2,
	): void;
	public abstract drawText(text: string, transform: Mat33, style: TextRenderingStyle): void;
	public abstract drawImage(image: RenderableImage): void;

	// Returns true iff the given rectangle is so small, rendering anything within
	// it has no effect on the image.
	public abstract isTooSmallToRender(rect: Rect2): boolean;

	public setDraftMode(_draftMode: boolean) { }

	protected objectLevel: number = 0;
	private currentPaths: RenderablePathSpec[]|null = null;
	private flushPath() {
		if (!this.currentPaths) {
			return;
		}

		let lastStyle: RenderingStyle|null = null;
		for (const path of this.currentPaths) {
			const { startPoint, commands, style } = path;

			if (!lastStyle || !stylesEqual(lastStyle, style)) {
				if (lastStyle) {
					this.endPath(lastStyle);
				}

				this.beginPath(startPoint);
				lastStyle = style;
			} else {
				this.moveTo(startPoint);
			}

			for (const command of commands) {
				if (command.kind === PathCommandType.LineTo) {
					this.lineTo(command.point);
				} else if (command.kind === PathCommandType.MoveTo) {
					this.moveTo(command.point);
				} else if (command.kind === PathCommandType.CubicBezierTo) {
					this.traceCubicBezierCurve(
						command.controlPoint1, command.controlPoint2, command.endPoint
					);
				} else if (command.kind === PathCommandType.QuadraticBezierTo) {
					this.traceQuadraticBezierCurve(
						command.controlPoint, command.endPoint
					);
				}
			}
		}

		if (lastStyle) {
			this.endPath(lastStyle);
		}

		this.currentPaths = [];
	}

	/**
	 * Draws a styled path. If within an object started by {@link startObject},
	 * the resultant path may not be visible until {@link endObject} is called.
	 */
	public drawPath(path: RenderablePathSpec) {
		// If we're being called outside of an object,
		// we can't delay rendering
		if (this.objectLevel === 0 || this.currentPaths === null) {
			this.currentPaths = [path];
			this.flushPath();
			this.currentPaths = null;
		} else {
			// Otherwise, don't render paths all at once. This prevents faint lines between
			// segments of the same stroke from being visible.
			this.currentPaths.push(path);
		}
	}

	// Strokes a rectangle. Boundary lines have width [lineWidth] and are filled with [lineFill].
	// This is equivalent to `drawPath(Path.fromRect(...).toRenderable(...))`.
	public drawRect(rect: Rect2, lineWidth: number, lineFill: RenderingStyle) {
		const path = Path.fromRect(rect, lineWidth);
		this.drawPath(pathToRenderable(path, lineFill));
	}

	/** Draws a filled rectangle. */
	public fillRect(rect: Rect2, fill: Color4) {
		const path = Path.fromRect(rect);
		this.drawPath(pathToRenderable(path, { fill }));
	}

	/**
	 * This should be called whenever a new object is being drawn.
	 *
	 * @param _boundingBox The bounding box of the object to be drawn.
	 * @param _clip Whether content outside `_boundingBox` should be drawn. Renderers
	 *              that override this method are not required to support `_clip`.
	 */
	public startObject(_boundingBox: Rect2, _clip?: boolean) {
		if (this.objectLevel > 0) {
			this.flushPath();
		}

		this.currentPaths = [];
		this.objectLevel ++;
	}

	/**
	 * Notes the end of an object.
	 * @param _loaderData - a map from strings to JSON-ifyable objects
	 * and contains properties attached to the object by whatever loader loaded the image. This
	 * is used to preserve attributes not supported by js-draw when loading/saving an image.
	 * Renderers may ignore this.
	 *
	 * @param _objectTags - a list of labels (e.g. `className`s) to be attached to the object.
	 * Renderers may ignore this.
	 */
	public endObject(_loaderData?: LoadSaveDataTable, _objectTags?: string[]) {
		// Render the paths all at once
		this.flushPath();
		this.currentPaths = null;
		this.objectLevel --;

		if (this.objectLevel < 0) {
			throw new Error(
				'More objects have ended than have been started (negative object nesting level)!'
			);
		}
	}

	protected getNestingLevel() {
		return this.objectLevel;
	}

	// Draw a representation of [points]. Intended for debugging.
	public abstract drawPoints(...points: Point2[]): void;


	// Returns true iff other can be rendered onto this without data loss.
	public canRenderFromWithoutDataLoss(_other: AbstractRenderer): boolean {
		return false;
	}

	// MUST throw if other and this are not of the same base class.
	public renderFromOtherOfSameType(_renderTo: Mat33, other: AbstractRenderer) {
		throw new Error(`Unable to render from ${other}: Not implemented`);
	}

	// Set a transformation to apply to things before rendering,
	// replacing the viewport's transform.
	public setTransform(transform: Mat33|null) {
		this.selfTransform = transform;
	}

	public pushTransform(transform: Mat33) {
		this.transformStack.push(this.selfTransform);
		this.setTransform(this.getCanvasToScreenTransform().rightMul(transform));
	}

	public popTransform() {
		if (this.transformStack.length === 0) {
			throw new Error('Unable to pop more transforms than have been pushed!');
		}

		this.setTransform(this.transformStack.pop() ?? null);
	}

	// Get the matrix that transforms a vector on the canvas to a vector on this'
	// rendering target.
	public getCanvasToScreenTransform(): Mat33 {
		if (this.selfTransform) {
			return this.selfTransform;
		}
		return this.viewport.canvasToScreenTransform;
	}

	public canvasToScreen(vec: Vec2): Vec2 {
		return this.getCanvasToScreenTransform().transformVec2(vec);
	}

	public getSizeOfCanvasPixelOnScreen(): number {
		return this.getCanvasToScreenTransform().transformVec3(Vec2.unitX).length();
	}

	private visibleRectOverride: Rect2|null;

	/**
	 * @internal
	 */
	public overrideVisibleRect(rect: Rect2|null) {
		this.visibleRectOverride = rect;
	}

	// Returns the region in canvas space that is visible within the viewport this
	// canvas is rendering to.
	//
	// Note that in some cases this might not be the same as the `visibleRect` given
	// to components in their `render` method.
	public getVisibleRect() {
		return this.visibleRectOverride ?? this.viewport.visibleRect;
	}
}
