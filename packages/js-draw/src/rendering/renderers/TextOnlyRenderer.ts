import { Vec2, Vec3, Rect2, Mat33 } from '@js-draw/math';
import Viewport from '../../Viewport';
import { TextRendererLocalization } from '../localization';
import RenderingStyle from '../RenderingStyle';
import TextRenderingStyle from '../TextRenderingStyle';
import AbstractRenderer, { RenderableImage } from './AbstractRenderer';

// Outputs a description of what was rendered.
export default class TextOnlyRenderer extends AbstractRenderer {
	private descriptionBuilder: string[] = [];
	private pathCount: number = 0;
	private textNodeCount: number = 0;
	private imageNodeCount: number = 0;

	public constructor(viewport: Viewport, private localizationTable: TextRendererLocalization) {
		super(viewport);
	}

	public displaySize(): Vec3 {
		// We don't have a graphical display, export a reasonable size.
		return Vec2.of(500, 500);
	}

	public clear(): void {
		this.descriptionBuilder = [];
		this.pathCount = 0;
		this.textNodeCount = 0;
		this.imageNodeCount = 0;
	}

	public getDescription(): string {
		return [
			this.localizationTable.pathNodeCount(this.pathCount),
			...(this.textNodeCount > 0 ? [this.localizationTable.textNodeCount(this.textNodeCount)] : []),
			...(this.imageNodeCount > 0 ? [this.localizationTable.imageNodeCount(this.imageNodeCount)] : []),
			...this.descriptionBuilder
		].join('\n');
	}

	protected beginPath(_startPoint: Vec3): void {
	}
	protected endPath(_style: RenderingStyle): void {
		this.pathCount ++;
	}
	protected lineTo(_point: Vec3): void {
	}
	protected moveTo(_point: Vec3): void {
	}
	protected traceCubicBezierCurve(_p1: Vec3, _p2: Vec3, _p3: Vec3): void {
	}
	protected traceQuadraticBezierCurve(_controlPoint: Vec3, _endPoint: Vec3): void {
	}
	public drawText(text: string, _transform: Mat33, _style: TextRenderingStyle): void {
		this.descriptionBuilder.push(this.localizationTable.textNode(text));
		this.textNodeCount ++;
	}
	public drawImage(image: RenderableImage) {
		const label = image.label ? this.localizationTable.imageNode(image.label) : this.localizationTable.unlabeledImageNode;

		this.descriptionBuilder.push(label);
		this.imageNodeCount ++;
	}
	public isTooSmallToRender(rect: Rect2): boolean {
		return rect.maxDimension < 15 / this.getSizeOfCanvasPixelOnScreen();
	}
	public drawPoints(..._points: Vec3[]): void {
	}
}
