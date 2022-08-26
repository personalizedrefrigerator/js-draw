import Command from './commands/Command';
import { CommandLocalization } from './commands/localization';
import Editor from './Editor';
import Mat33 from './geometry/Mat33';
import Rect2 from './geometry/Rect2';
import { Point2, Vec2 } from './geometry/Vec2';
import Vec3 from './geometry/Vec3';
import { StrokeDataPoint } from './StrokeBuilder';
import { EditorEventType, EditorNotifier } from './types';

// Returns the base type of some type of point/number
type PointDataType<T extends Point2|StrokeDataPoint|number> = T extends Point2 ? Point2 : number;

export class Viewport {
	// Command that translates/scales the viewport.
	public static ViewportTransform = class implements Command {
		private readonly inverseTransform: Mat33;

		public constructor(public readonly transform: Mat33) {
			this.inverseTransform = transform.inverse();
		}

		public apply(editor: Editor) {
			const viewport = editor.viewport;
			viewport.resetTransform(viewport.transform.rightMul(this.transform));
			editor.queueRerender();
		}

		public unapply(editor: Editor) {
			const viewport = editor.viewport;
			viewport.resetTransform(viewport.transform.rightMul(this.inverseTransform));
			editor.queueRerender();
		}

		public description(localizationTable: CommandLocalization): string {
			const result: string[] = [];

			// Describe the transformation's affect on the viewport (note that transformation transforms
			// the **elements** within the viewport). Assumes the transformation only does rotation/scale/translation.
			const origVec = Vec2.unitX;
			const linearTransformedVec = this.transform.transformVec3(Vec2.unitX);
			const affineTransformedVec = this.transform.transformVec2(Vec2.unitX);

			const scale = linearTransformedVec.magnitude();
			const rotation = 180 / Math.PI * linearTransformedVec.angle();
			const translation = affineTransformedVec.minus(origVec);

			if (scale > 1.2) {
				result.push(localizationTable.zoomedIn);
			}
			else if (scale < 0.8) {
				result.push(localizationTable.zoomedOut);
			}

			if (Math.floor(Math.abs(rotation)) > 0) {
				result.push(localizationTable.rotatedBy(Math.round(rotation)));
			}

			const minTranslation = 1e-4;
			if (translation.x > minTranslation) {
				result.push(localizationTable.movedLeft);
			} else if (translation.x < -minTranslation) {
				result.push(localizationTable.movedRight);
			}

			if (translation.y < minTranslation) {
				result.push(localizationTable.movedDown);
			} else if (translation.y > minTranslation) {
				result.push(localizationTable.movedUp);
			}

			return result.join('; ');
		}
	};

	private transform: Mat33;
	private inverseTransform: Mat33;
	private screenRect: Rect2;

	public constructor(private notifier: EditorNotifier) {
		this.resetTransform(Mat33.identity);
		this.screenRect = Rect2.empty;
	}

	public updateScreenSize(screenSize: Vec2) {
		this.screenRect = this.screenRect.resizedTo(screenSize);
	}

	public get visibleRect(): Rect2 {
		return this.screenRect.transformedBoundingBox(this.inverseTransform);
	}

	// the given point, but in canvas coordinates
	public screenToCanvas(screenPoint: Point2): Point2 {
		return this.inverseTransform.transformVec2(screenPoint);
	}

	public canvasToScreen(canvasPoint: Point2): Point2 {
		return this.transform.transformVec2(canvasPoint);
	}

	// Updates the transformation directly. Using ViewportTransform is preferred.
	// [newTransform] should map from canvas coordinates to screen coordinates.
	public resetTransform(newTransform: Mat33) {
		this.transform = newTransform;
		this.inverseTransform = newTransform.inverse();
		this.notifier.dispatch(EditorEventType.ViewportChanged, {
			kind: EditorEventType.ViewportChanged,
			newTransform,
		});
	}

	public get screenToCanvasTransform(): Mat33 {
		return this.inverseTransform;
	}

	public get canvasToScreenTransform(): Mat33 {
		return this.transform;
	}

	// Returns the amount a vector on the canvas is scaled to become a vector on the screen.
	public getScaleFactor(): number {
		// Use transformVec3 to avoid translating the vector
		return this.transform.transformVec3(Vec3.unitX).magnitude();
	}

	// Returns the angle of the canvas in radians
	public getRotationAngle(): number {
		return this.transform.transformVec3(Vec3.unitX).angle();
	}

	// Rounds the given [point] to a multiple of 10 such that it is within [tolerance] of
	// its original location. This is useful for preparing data for base-10 conversion.
	public static roundPoint<T extends Point2|number>(
		point: T, tolerance: number,
	): PointDataType<T>;

	// The separate function type definition seems necessary here.
	// See https://stackoverflow.com/a/58163623/17055750.
	// eslint-disable-next-line no-dupe-class-members
	public static roundPoint(
		point: Point2|number, tolerance: number
	): Point2|number {
		const scaleFactor = 10 ** Math.floor(Math.log10(tolerance));
		const roundComponent = (component: number): number => {
			return Math.round(component / scaleFactor) * scaleFactor;
		};

		if (typeof point === 'number') {
			return roundComponent(point);
		}

		return point.map(roundComponent);
	}


	// Round a point with a tolerance of ±1 screen unit.
	public roundPoint(point: Point2): Point2 {
		return Viewport.roundPoint(point, 1 / this.getScaleFactor());
	}
}

export namespace Viewport { // eslint-disable-line
	// Needed to allow accessing as a type. See https://stackoverflow.com/a/68201883
	export type ViewportTransform = typeof Viewport.ViewportTransform.prototype;
}

export default Viewport;