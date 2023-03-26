import Color4 from '../Color4';
import Editor from '../Editor';
import EditorImage, { EditorImageEventType } from '../EditorImage';
import { DispatcherEventListener } from '../EventDispatcher';
import SerializableCommand from '../commands/SerializableCommand';
import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
import Rect2 from '../math/Rect2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';
import RestyleableComponent, { ComponentStyle, createRestyleComponentCommand } from './RestylableComponent';
import Path, { PathCommand, PathCommandType } from '../math/Path';
import { Vec2 } from '../math/Vec2';
import Viewport from '../Viewport';
import { toRoundedString } from '../math/rounding';

export enum BackgroundType {
	SolidColor,
	Grid,
	None,
}

export const imageBackgroundCSSClassName = 'js-draw-image-background';

// Class name prefix indicating the size of the background's grid cells (if present).
export const imageBackgroundGridSizeCSSPrefix = 'js-draw-image-background-grid-';

// Flag included in rendered SVGs (etc) that indicates that the secondary color of the
// background has been manually set.
export const imageBackgroundNonAutomaticSecondaryColorCSSClassName = 'js-draw-image-background-non-automatic-secondary-color';

export const backgroundTypeToClassNameMap = {
	[BackgroundType.Grid]: 'js-draw-image-background-grid',
	[BackgroundType.SolidColor]: imageBackgroundCSSClassName,
	[BackgroundType.None]: '',
};

// Represents the background of the editor's canvas.
export default class BackgroundComponent extends AbstractComponent implements RestyleableComponent {
	protected contentBBox: Rect2;
	private viewportSizeChangeListener: DispatcherEventListener|null = null;

	private gridSize: number = Viewport.getGridSize(2);
	private gridStrokeWidth: number = 0.7;
	private secondaryColor: Color4|null = null;

	// eslint-disable-next-line @typescript-eslint/prefer-as-const
	readonly isRestylableComponent: true = true;

	public constructor(
		private backgroundType: BackgroundType, private mainColor: Color4
	) {
		super('image-background', 0);
		this.contentBBox = Rect2.empty;
	}

	public static ofGrid(
		backgroundColor: Color4, gridSize?: number, gridColor?: Color4, gridStrokeWidth?: number
	) {
		const background = new BackgroundComponent(BackgroundType.Grid, backgroundColor);

		if (gridSize !== undefined) {
			background.gridSize = gridSize;
		}

		if (gridColor !== undefined) {
			background.secondaryColor = gridColor;
		}

		if (gridStrokeWidth !== undefined) {
			background.gridStrokeWidth = gridStrokeWidth;
		}

		return background;
	}

	public getBackgroundType() {
		return this.backgroundType;
	}

	// @internal
	public getMainColor() {
		return this.mainColor;
	}

	// @internal
	public getSecondaryColor() {
		return this.secondaryColor;
	}

	// @internal
	public getGridSize() {
		return this.gridSize;
	}

	public getStyle(): ComponentStyle {
		let color: Color4|undefined = this.mainColor;

		if (this.backgroundType === BackgroundType.None) {
			color = undefined;
		}

		return {
			color,
		};
	}

	public updateStyle(style: ComponentStyle): SerializableCommand {
		return createRestyleComponentCommand(this.getStyle(), style, this);
	}

	// @internal
	public forceStyle(style: ComponentStyle, editor: Editor | null): void {
		const fill = style.color;

		if (!fill) {
			return;
		}

		this.mainColor = fill;

		// A solid background and transparent fill is equivalent to no background.
		if (fill.eq(Color4.transparent) && this.backgroundType === BackgroundType.SolidColor) {
			this.backgroundType = BackgroundType.None;
		} else if (this.backgroundType === BackgroundType.None) {
			this.backgroundType = BackgroundType.SolidColor;
		}

		if (editor) {
			editor.image.queueRerenderOf(this);
			editor.queueRerender();
		}
	}

	public onAddToImage(image: EditorImage) {
		if (this.viewportSizeChangeListener) {
			console.warn('onAddToImage called when background is already in an image');
			this.onRemoveFromImage();
		}

		this.viewportSizeChangeListener = image.notifier.on(
			EditorImageEventType.ExportViewportChanged, () => {
				this.recomputeBBox(image);
			});
		this.recomputeBBox(image);
	}

	public onRemoveFromImage(): void {
		this.viewportSizeChangeListener?.remove();
		this.viewportSizeChangeListener = null;
	}

	private recomputeBBox(image: EditorImage) {
		const importExportRect = image.getImportExportViewport().visibleRect;
		if (!this.contentBBox.eq(importExportRect)) {
			this.contentBBox = importExportRect;

			// Re-render this if already added to the EditorImage.
			image.queueRerenderOf(this);
		}
	}

	private generateGridPath(visibleRect?: Rect2) {
		const targetRect = visibleRect?.grownBy(this.gridStrokeWidth)?.intersection(this.contentBBox) ?? this.contentBBox;

		const roundDownToGrid = (coord: number) => Math.floor(coord / this.gridSize) * this.gridSize;
		const roundUpToGrid = (coord: number) => Math.ceil(coord / this.gridSize) * this.gridSize;

		const startY = roundUpToGrid(targetRect.y);
		const endY = roundDownToGrid(targetRect.y + targetRect.h);
		const startX = roundUpToGrid(targetRect.x);
		const endX = roundDownToGrid(targetRect.x + targetRect.w);

		const result: PathCommand[] = [];

		// Don't generate grids with a huge number of rows/columns -- such grids
		// take a long time to render and are likely invisible due to the number of
		// cells.
		const rowCount = (endY - startY) / this.gridSize;
		const colCount = (endX - startX) / this.gridSize;
		const maxGridCols = 1000;
		const maxGridRows = 1000;
		if (rowCount > maxGridRows || colCount > maxGridCols) {
			return Path.empty;
		}

		const startPoint = Vec2.of(targetRect.x, startY);
		for (let y = startY; y <= endY; y += this.gridSize) {
			result.push({
				kind: PathCommandType.MoveTo,
				point: Vec2.of(targetRect.x, y),
			});
			result.push({
				kind: PathCommandType.LineTo,
				point: Vec2.of(targetRect.x + targetRect.w, y),
			});
		}

		for (let x = startX; x <= endX; x += this.gridSize) {
			result.push({
				kind: PathCommandType.MoveTo,
				point: Vec2.of(x, targetRect.y),
			});
			result.push({
				kind: PathCommandType.LineTo,
				point: Vec2.of(x, targetRect.y + targetRect.h)
			});
		}

		return new Path(startPoint, result);
	}

	public render(canvas: AbstractRenderer, visibleRect?: Rect2) {
		if (this.backgroundType === BackgroundType.None) {
			return;
		}
		const clip = true;
		canvas.startObject(this.contentBBox, clip);

		if (this.backgroundType === BackgroundType.SolidColor || this.backgroundType === BackgroundType.Grid) {
			// If the rectangle for this region contains the visible rect,
			// we can fill the entire visible rectangle (which may be more efficient than
			// filling the entire region for this.)
			if (visibleRect) {
				const intersection = visibleRect.intersection(this.contentBBox);
				if (intersection) {
					canvas.fillRect(intersection, this.mainColor);
				}
			} else {
				canvas.fillRect(this.contentBBox, this.mainColor);
			}
		}

		if (this.backgroundType === BackgroundType.Grid) {
			let gridColor = this.secondaryColor;
			gridColor ??= Color4.ofRGBA(1 - this.mainColor.r, 1 - this.mainColor.g, 1 - this.mainColor.b, 0.2);

			// If the background fill is completely transparent, ensure visibility on otherwise light
			// and dark backgrounds.
			if (this.mainColor.a === 0) {
				gridColor = Color4.ofRGBA(0.5, 0.5, 0.5, 0.2);
			}

			const style = {
				fill: Color4.transparent,
				stroke: { width: this.gridStrokeWidth, color: gridColor }
			};
			canvas.drawPath(this.generateGridPath(visibleRect).toRenderable(style));
		}

		const backgroundTypeCSSClass = backgroundTypeToClassNameMap[this.backgroundType];
		const classNames = [ imageBackgroundCSSClassName ];

		if (backgroundTypeCSSClass !== imageBackgroundCSSClassName) {
			classNames.push(backgroundTypeCSSClass);

			const gridSizeStr = toRoundedString(this.gridSize).replace(/[.]/g, 'p');
			classNames.push(imageBackgroundGridSizeCSSPrefix + gridSizeStr);
		}

		if (this.secondaryColor !== null) {
			classNames.push(imageBackgroundNonAutomaticSecondaryColorCSSClassName);
		}

		canvas.endObject(this.getLoadSaveData(), classNames);
	}

	public intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.getEdges().some(edge => edge.intersects(lineSegment));
	}

	public isSelectable(): boolean {
		return false;
	}

	public isBackground(): boolean {
		return true;
	}

	protected serializeToJSON() {
		return {
			mainColor: this.mainColor.toHexString(),
			secondaryColor: this.secondaryColor?.toHexString(),
			backgroundType: this.backgroundType,
			gridSize: this.gridSize,
			gridStrokeWidth: this.gridStrokeWidth,
		};
	}

	protected applyTransformation(_affineTransfm: Mat33) {
		// Do nothing — it doesn't make sense to transform the background.
	}

	public description(localizationTable: ImageComponentLocalization) {
		if (this.backgroundType === BackgroundType.SolidColor) {
			return localizationTable.filledBackgroundWithColor(this.mainColor.toString());
		} else {
			return localizationTable.emptyBackground;
		}
	}

	protected createClone(): AbstractComponent {
		return new BackgroundComponent(this.backgroundType, this.mainColor);
	}

	// @internal
	public static deserializeFromJSON(json: any) {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (typeof json.mainColor !== 'string') {
			throw new Error('Error deserializing — mainColor must be of type string.');
		}

		let backgroundType;
		const jsonBackgroundType = json.backgroundType as BackgroundType;

		if (
			jsonBackgroundType === BackgroundType.None || jsonBackgroundType === BackgroundType.Grid
			|| jsonBackgroundType === BackgroundType.SolidColor
		) {
			backgroundType = jsonBackgroundType;
		} else {
			const exhaustivenessCheck: never = jsonBackgroundType;
			return exhaustivenessCheck;
		}

		const mainColor = Color4.fromHex(json.mainColor);
		const secondaryColor = json.secondaryColor ? Color4.fromHex(json.secondaryColor) : null;
		const gridSize: number|undefined = json.gridSize ?? undefined;
		const gridStrokeWidth: number|undefined = json.gridStrokeWidth ?? undefined;

		const result = new BackgroundComponent(backgroundType, mainColor);
		result.secondaryColor = secondaryColor;
		if (gridSize) {
			result.gridSize = gridSize;
		}
		if (gridStrokeWidth) {
			result.gridStrokeWidth = gridStrokeWidth;
		}

		return result;
	}
}

AbstractComponent.registerComponent('image-background', BackgroundComponent.deserializeFromJSON);
