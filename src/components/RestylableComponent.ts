import Color4 from '../Color4';
import SerializableCommand from '../commands/SerializableCommand';
import UnresolvedSerializableCommand from '../commands/UnresolvedCommand';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import TextStyle, { textStyleFromJSON, textStyleToJSON } from '../rendering/TextRenderingStyle';
import AbstractComponent from './AbstractComponent';

export interface ComponentStyle {
	color?: Color4;
	textStyle?: TextStyle;
}

const serializeComponentStyle = (style: ComponentStyle) => {
	const result: Record<string, any> = { };
	
	if (style.color) {
		result.color = style.color.toHexString();
	}

	if (style.textStyle) {
		result.textStyle = textStyleToJSON(style.textStyle);
	}

	return result;
};

const deserializeComponentStyle = (json: Record<string, any>|any): ComponentStyle => {
	const color = json.color ? Color4.fromHex(json.color) : undefined;
	const textStyle = json.textStyle ? textStyleFromJSON(json.textStyle) : undefined;

	return {
		color,
		textStyle,
	};
};

// For internal use by Components implementing `updateStyle`:
export const createRestyleComponentCommand = (
	initialStyle: ComponentStyle,
	newStyle: ComponentStyle,
	component: RestyleableComponent,
): SerializableCommand => {
	return new DefaultRestyleComponentCommand(
		initialStyle, newStyle, component.getId(), component
	);
};

export interface RestyleableComponent extends AbstractComponent {
	getStyle(): ComponentStyle;

	updateStyle(style: ComponentStyle): SerializableCommand;

	/**
	 * Set the style of this component in a way that can't be undone/redone
	 * (does not create a command).
	 * 
	 * Prefer `updateStyle(style).apply(editor)`.
	 */
	forceStyle(style: ComponentStyle, editor: Editor|null): void;
}

export default RestyleableComponent;


const defaultRestyleComponentCommandId = 'default-restyle-element';

class DefaultRestyleComponentCommand extends UnresolvedSerializableCommand {
	public constructor(
		private originalStyle: ComponentStyle,
		private newStyle: ComponentStyle,
		componentID: string,
		component?: RestyleableComponent,
	) {
		super(defaultRestyleComponentCommandId, componentID, component);
	}

	private getComponent(editor: Editor): RestyleableComponent {
		this.resolveComponent(editor.image);

		const component = this.component as any;
		if (!component || !component['forceStyle'] || !component['updateStyle']) {
			throw new Error('this.component is missing forceStyle and/or updateStyle methods!');
		}

		return component;
	}

	public apply(editor: Editor) {
		this.getComponent(editor).forceStyle(this.newStyle, editor);
	}

	public unapply(editor: Editor) {
		this.getComponent(editor).forceStyle(this.originalStyle, editor);
	}

	public description(_editor: Editor, localizationTable: EditorLocalization): string {
		return localizationTable.restyledElements;
	}

	protected serializeToJSON() {
		return {
			id: this.componentID,
			originalStyle: serializeComponentStyle(this.originalStyle),
			newStyle: serializeComponentStyle(this.newStyle),
		};
	}

	static {
		SerializableCommand.register(defaultRestyleComponentCommandId, (json: any, _editor: Editor) => {
			const origStyle = deserializeComponentStyle(json.originalStyle);
			const newStyle = deserializeComponentStyle(json.newStyle);
			const id = json.id;
			if (typeof json.id !== 'string') {
				throw new Error(`json.id is of type ${(typeof json.id)}, not string.`);
			}

			return new DefaultRestyleComponentCommand(
				origStyle,
				newStyle,
				id,
			);
		});
	}
}
