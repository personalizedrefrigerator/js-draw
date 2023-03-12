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

export enum BackgroundType {
	SolidColor,
	None,
}

export const imageBackgroundCSSClassName = 'js-draw-image-background';

// Represents the background of the editor's canvas.
export default class ImageBackground extends AbstractComponent implements RestyleableComponent {
	protected contentBBox: Rect2;
	private viewportSizeChangeListener: DispatcherEventListener|null = null;

	// eslint-disable-next-line @typescript-eslint/prefer-as-const
	readonly isRestylableComponent: true = true;

	public constructor(
		private backgroundType: BackgroundType, private mainColor: Color4
	) {
		super('image-background', 0);
		this.contentBBox = Rect2.empty;
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
		if (fill.eq(Color4.transparent)) {
			this.backgroundType = BackgroundType.None;
		} else {
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

	public render(canvas: AbstractRenderer, visibleRect?: Rect2) {
		if (this.backgroundType === BackgroundType.None) {
			return;
		}
		canvas.startObject(this.contentBBox);

		if (this.backgroundType === BackgroundType.SolidColor) {
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

		canvas.endObject(this.getLoadSaveData(), [ imageBackgroundCSSClassName ]);
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
			backgroundType: this.backgroundType,
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
		return new ImageBackground(this.backgroundType, this.mainColor);
	}

	// @internal
	public static deserializeFromJSON(json: any) {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (typeof json.mainColor !== 'string') {
			throw new Error('Error deserializing — mainColor must be of type string.');
		}

		const backgroundType = json.backgroundType === BackgroundType.SolidColor ? BackgroundType.SolidColor : BackgroundType.None;
		const mainColor = Color4.fromHex(json.mainColor);

		return new ImageBackground(backgroundType, mainColor);
	}
}

AbstractComponent.registerComponent('image-background', ImageBackground.deserializeFromJSON);
