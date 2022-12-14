import LineSegment2 from '../math/LineSegment2';
import Mat33, { Mat33Array } from '../math/Mat33';
import Rect2 from '../math/Rect2';
import { Vec2 } from '../math/Vec2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

export interface TextStyle {
	size: number;
	fontFamily: string;
	fontWeight?: string;
	fontVariant?: string;
	renderingStyle: RenderingStyle;
}

const componentTypeId = 'text';
export default class TextComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor(
		protected readonly textObjects: Array<string|TextComponent>,
		private transform: Mat33,
		private style: TextStyle,
	) {
		super(componentTypeId);
		this.recomputeBBox();

		// If this has no direct children, choose a style representative of this' content
		// (useful for estimating the style of the TextComponent).
		const hasDirectContent = textObjects.some(obj => typeof obj === 'string');
		if (!hasDirectContent && textObjects.length > 0) {
			this.style = (textObjects[0] as TextComponent).getTextStyle();
		}
	}

	public static applyTextStyles(ctx: CanvasRenderingContext2D, style: TextStyle) {
		// Quote the font family if necessary.
		const fontFamily = style.fontFamily.match(/\s/) ? style.fontFamily.replace(/["]/g, '\\"') : style.fontFamily;

		ctx.font =	[
			(style.size ?? 12) + 'px',
			style.fontWeight ?? '',
			`${fontFamily}`,
			style.fontWeight
		].join(' ');

		ctx.textAlign = 'left';
	}

	private static textMeasuringCtx: CanvasRenderingContext2D|null = null;

	// Roughly estimate the bounding box of `text`. Use if no CanvasRenderingContext2D is available.
	private static estimateTextDimens(text: string, style: TextStyle): Rect2 {
		const widthEst = text.length * style.size;
		const heightEst = style.size;

		// Text is drawn with (0, 0) as its baseline. As such, the majority of the text's height should
		// be above (0, 0).
		return new Rect2(0, -heightEst * 2/3, widthEst, heightEst);
	}

	// Returns the bounding box of `text`. This is approximate if no Canvas is available.
	private static getTextDimens(text: string, style: TextStyle): Rect2 {
		TextComponent.textMeasuringCtx ??= document.createElement('canvas').getContext('2d') ?? null;
		if (!TextComponent.textMeasuringCtx) {
			return this.estimateTextDimens(text, style);
		}

		const ctx = TextComponent.textMeasuringCtx;
		TextComponent.applyTextStyles(ctx, style);

		const measure = ctx.measureText(text);

		// Text is drawn with (0,0) at the bottom left of the baseline.
		const textY = -measure.actualBoundingBoxAscent;
		const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
		return new Rect2(0, textY, measure.width, textHeight);
	}

	private computeBBoxOfPart(part: string|TextComponent) {
		if (typeof part === 'string') {
			const textBBox = TextComponent.getTextDimens(part, this.style);
			return textBBox.transformedBoundingBox(this.transform);
		} else {
			const bbox = part.contentBBox.transformedBoundingBox(this.transform);
			return bbox;
		}
	}

	private recomputeBBox() {
		let bbox: Rect2|null = null;

		for (const textObject of this.textObjects) {
			const currentBBox = this.computeBBoxOfPart(textObject);
			bbox ??= currentBBox;
			bbox = bbox.union(currentBBox);
		}

		this.contentBBox = bbox ?? Rect2.empty;
	}

	private renderInternal(canvas: AbstractRenderer) {
		const cursor = this.transform;

		for (const textObject of this.textObjects) {
			if (typeof textObject === 'string') {
				canvas.drawText(textObject, cursor, this.style);
			} else {
				canvas.pushTransform(cursor);
				textObject.renderInternal(canvas);
				canvas.popTransform();
			}
		}
	}

	public render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);
		this.renderInternal(canvas);
		canvas.endObject(this.getLoadSaveData());
	}

	public getProportionalRenderingTime(): number {
		return this.textObjects.length;
	}

	public intersects(lineSegment: LineSegment2): boolean {

		// Convert canvas space to internal space.
		const invTransform = this.transform.inverse();
		const p1InThisSpace = invTransform.transformVec2(lineSegment.p1);
		const p2InThisSpace = invTransform.transformVec2(lineSegment.p2);
		lineSegment = new LineSegment2(p1InThisSpace, p2InThisSpace);

		for (const subObject of this.textObjects) {
			if (typeof subObject === 'string') {
				const textBBox = TextComponent.getTextDimens(subObject, this.style);

				// TODO: Use a better intersection check. Perhaps draw the text onto a CanvasElement and
				// use pixel-testing to check for intersection with its contour.
				if (textBBox.getEdges().some(edge => lineSegment.intersection(edge) !== null)) {
					return true;
				}
			} else {
				if (subObject.intersects(lineSegment)) {
					return true;
				}
			}
		}

		return false;
	}

	public getBaselinePos() {
		return this.transform.transformVec2(Vec2.zero);
	}

	public getTextStyle() {
		return this.style;
	}

	public getTransform(): Mat33 {
		return this.transform;
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.transform = affineTransfm.rightMul(this.transform);
		this.recomputeBBox();
	}

	protected createClone(): AbstractComponent {
		return new TextComponent(this.textObjects, this.transform, this.style);
	}

	public getText() {
		const result: string[] = [];

		for (const textObject of this.textObjects) {
			if (typeof textObject === 'string') {
				result.push(textObject);
			} else {
				result.push(textObject.getText());
			}
		}

		return result.join('\n');
	}

	public description(localizationTable: ImageComponentLocalization): string {
		return localizationTable.text(this.getText());
	}

	protected serializeToJSON(): Record<string, any> {
		const serializableStyle = {
			...this.style,
			renderingStyle: styleToJSON(this.style.renderingStyle),
		};

		const textObjects = this.textObjects.map(text => {
			if (typeof text === 'string') {
				return {
					text,
				};
			} else {
				return {
					json: text.serializeToJSON(),
				};
			}
		});

		return {
			textObjects,
			transform: this.transform.toArray(),
			style: serializableStyle,
		};
	}

	public static deserializeFromString(json: any): TextComponent {
		const style: TextStyle = {
			renderingStyle: styleFromJSON(json.style.renderingStyle),
			size: json.style.size,
			fontWeight: json.style.fontWeight,
			fontVariant: json.style.fontVariant,
			fontFamily: json.style.fontFamily,
		};

		const textObjects: Array<string|TextComponent> = json.textObjects.map((data: any) => {
			if ((data.text ?? null) !== null) {
				return data.text;
			}

			return TextComponent.deserializeFromString(data.json);
		});

		json.transform = json.transform.filter((elem: any) => typeof elem === 'number');
		if (json.transform.length !== 9) {
			throw new Error(`Unable to deserialize transform, ${json.transform}.`);
		}

		const transformData = json.transform as Mat33Array;
		const transform = new Mat33(...transformData);

		return new TextComponent(textObjects, transform, style);
	}

	public static fromLines(lines: string[], transform: Mat33, style: TextStyle): AbstractComponent {
		let lastComponent: TextComponent|null = null;
		const components: TextComponent[] = [];

		for (const line of lines) {
			let position = Vec2.zero;
			if (lastComponent) {
				const lineMargin = Math.floor(style.size);
				position = lastComponent.getBBox().bottomLeft.plus(Vec2.unitY.times(lineMargin));
			}

			const component = new TextComponent([ line ], Mat33.translation(position), style);
			components.push(component);
			lastComponent = component;
		}

		return new TextComponent(components, transform, style);
	}
}

AbstractComponent.registerComponent(componentTypeId, (data: string) => TextComponent.deserializeFromString(data));