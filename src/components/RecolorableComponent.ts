import Color4 from '../Color4';
import SerializableCommand from '../commands/SerializableCommand';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';

// Components with a changable color should extend this abstract class (e.g. `Text`, `Stroke`s, etc.)
export default abstract class RecolorableComponent extends AbstractComponent {
	protected abstract getRenderingStyle(): RenderingStyle;
	protected abstract setRenderingStyle(style: RenderingStyle): void;

	public setColor(color: Color4): SerializableCommand {
		const prevStyle = this.getRenderingStyle();
		return new RecolorableComponent.SetColorCommand(this.getId(), prevStyle, color);
	}

	private static SetColorCommand = class extends SerializableCommand {
		public static id = 'TextComponent::SetColorCommand';

		public constructor(private elemId: string, private prevStyle: RenderingStyle, private newColor: Color4) {
			super(RecolorableComponent.SetColorCommand.id);
		}

		protected serializeToJSON() {
			return {
				style: styleToJSON(this.prevStyle),
				newColor: this.newColor.toHexString(),
				elemId: this.elemId,
			};
		}

		public apply(editor: Editor) {
			const elem = editor.image.lookupElement(this.elemId);

			if (elem instanceof RecolorableComponent) {
				elem.setColorDirectly(this.newColor);
				editor.queueRerender();
			} else {
				console.warn(`Unable to apply command: ${this.elemId} does not point to a TextComponent!`);
			}
		}
		public unapply(editor: Editor) {
			const elem = editor.image.lookupElement(this.elemId);

			if (elem instanceof RecolorableComponent) {
				elem.setRenderingStyle(this.prevStyle);
				editor.queueRerender();
			} else {
				console.warn(`Unable to unapply command: ${this.elemId} does not point to a TextComponent!`);
			}
		}

		public description(_editor: Editor, localizationTable: EditorLocalization): string {
			return localizationTable.setColor(this.newColor.toHexString());
		}
	};

	static {
		SerializableCommand.register(RecolorableComponent.SetColorCommand.id, (serialized: any) => {
			if (typeof serialized === 'string') {
				serialized = JSON.parse(serialized);
			}

			const prevStyle: RenderingStyle = styleFromJSON(serialized.style);
			const newColor: Color4 = Color4.fromHex(serialized.newColor);

			return new this.SetColorCommand(serialized.elemId, prevStyle, newColor);
		});
	}

	private setColorDirectly(color: Color4) {
		const style = { ...this.getRenderingStyle() };

		if (style.fill.a > 0) {
			style.fill = color;
		}

		if (style.stroke && style.stroke.color.a > 0) {
			style.stroke = {
				...style.stroke,
				color: color,
			};
		}

		this.setRenderingStyle(style);
	}
}