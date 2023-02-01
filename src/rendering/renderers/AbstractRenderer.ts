import { LoadSaveDataTable } from '../../components/AbstractComponent';
import Mat33 from '../../math/Mat33';
import Path, { PathCommand, PathCommandType } from '../../math/Path';
import Rect2 from '../../math/Rect2';
import { Point2, Vec2 } from '../../math/Vec2';
import Viewport from '../../Viewport';
import RenderingStyle, { stylesEqual } from '../RenderingStyle';
import TextStyle from '../TextRenderingStyle';

export interface RenderablePathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	style: RenderingStyle;
	path?: Path;
}

export interface RenderableImage {
	transform: Mat33;

	// An Image or HTMLCanvasElement. If an Image, it must be loaded from the same origin as this
	// (and should have `src=this.base64Url`).
	image: HTMLImageElement|HTMLCanvasElement;

	// All images that can be drawn **must** have a base64 URL in the form
	// data:image/[format];base64,[data here]
	// If `image` is an Image, this should be equivalent to `image.src`.
	base64Url: string;

	label?: string;
}

export default abstract class AbstractRenderer {
	// If null, this' transformation is linked to the Viewport
	private selfTransform: Mat33|null = null;
	private transformStack: Array<Mat33|null> = [];

	protected constructor(private viewport: Viewport) { }

	// this.canvasToScreen, etc. should be used instead of the corresponding
	// methods on Viewport.
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
	public abstract drawText(text: string, transform: Mat33, style: TextStyle): void;
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
	}

	public drawPath(path: RenderablePathSpec) {
		// If we're being called outside of an object,
		// we can't delay rendering
		if (this.objectLevel === 0) {
			this.currentPaths = [path];
			this.flushPath();
			this.currentPaths = null;
		} else {
			// Otherwise, don't render paths all at once. This prevents faint lines between
			// segments of the same stroke from being visible.
			this.currentPaths!.push(path);
		}
	}

	// Draw a rectangle. Boundary lines have width [lineWidth] and are filled with [lineFill].
	// This is equivalent to `drawPath(Path.fromRect(...).toRenderable(...))`.
	public drawRect(rect: Rect2, lineWidth: number, lineFill: RenderingStyle) {
		const path = Path.fromRect(rect, lineWidth);
		this.drawPath(path.toRenderable(lineFill));
	}

	// Note the start/end of an object with the given bounding box.
	// Renderers are not required to support [clip]
	public startObject(_boundingBox: Rect2, _clip?: boolean) {
		this.currentPaths = [];
		this.objectLevel ++;
	}

	public endObject(_loaderData?: LoadSaveDataTable) {
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
}
