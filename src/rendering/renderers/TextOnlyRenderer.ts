import { TextStyle } from '../../components/Text';
import Mat33 from '../../math/Mat33';
import Rect2 from '../../math/Rect2';
import { Vec2 } from '../../math/Vec2';
import Vec3 from '../../math/Vec3';
import Viewport from '../../Viewport';
import { TextRendererLocalization } from '../localization';
import RenderingStyle from '../RenderingStyle';
import AbstractRenderer from './AbstractRenderer';

// Outputs a description of what was rendered.

export default class TextOnlyRenderer extends AbstractRenderer {
	private descriptionBuilder: string[] = [];
	private pathCount: number = 0;
	private textNodeCount: number = 0;

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
	}

	public getDescription(): string {
		return [
			this.localizationTable.pathNodeCount(this.pathCount),
			this.localizationTable.textNodeCount(this.textNodeCount),
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
	public drawText(text: string, _transform: Mat33, _style: TextStyle): void {
		this.descriptionBuilder.push(this.localizationTable.textNode(text));
		this.textNodeCount ++;
	}
	public isTooSmallToRender(rect: Rect2): boolean {
		return rect.maxDimension < 15 / this.getSizeOfCanvasPixelOnScreen();
	}
	public drawPoints(..._points: Vec3[]): void {
	}
}
