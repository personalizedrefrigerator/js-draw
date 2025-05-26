import { Color4 } from '@js-draw/math';
import SerializableCommand from '../commands/SerializableCommand';
import UnresolvedSerializableCommand from '../commands/UnresolvedCommand';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import TextRenderingStyle, {
	textStyleFromJSON,
	textStyleToJSON,
} from '../rendering/TextRenderingStyle';
import AbstractComponent from './AbstractComponent';

export interface ComponentStyle {
	color?: Color4;
	textStyle?: TextRenderingStyle;
}

const serializeComponentStyle = (style: ComponentStyle) => {
	const result: Record<string, any> = {};

	if (style.color) {
		result.color = style.color.toHexString();
	}

	if (style.textStyle) {
		result.textStyle = textStyleToJSON(style.textStyle);
	}

	return result;
};

const deserializeComponentStyle = (json: Record<string, any>): ComponentStyle => {
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
	return new DefaultRestyleComponentCommand(initialStyle, newStyle, component.getId(), component);
};

// Returns true if `component` is a `RestylableComponent`.
export const isRestylableComponent = (
	component: AbstractComponent,
): component is RestyleableComponent => {
	const hasMethods =
		'getStyle' in component && 'updateStyle' in component && 'forceStyle' in component;
	if (!hasMethods) {
		return false;
	}

	if (!('isRestylableComponent' in component) || !(component as any)['isRestylableComponent']) {
		return false;
	}

	return true;
};

/**
 * An interface to be implemented by components with a changable color or {@link TextRenderingStyle}.
 *
 * All such classes must have a member variable, `isRestylableComponent` that is set to `true`
 * to allow testing whether the class is a `RestylableComponent` (see {@link isRestylableComponent}).
 */
export interface RestyleableComponent extends AbstractComponent {
	/**
	 * @returns a partial representation of this component's style.
	 */
	getStyle(): ComponentStyle;

	/**
	 * Returns a {@link Command} that updates portions of this component's style
	 * to the given `style`.
	 *
	 * @example
	 * For some component and editor,
	 * ```ts
	 * editor.dispatch(component.updateStyle({ color: Color4.red }));
	 * ```
	 */
	updateStyle(style: ComponentStyle): SerializableCommand;

	/**
	 * Set the style of this component in a way that can't be undone/redone
	 * (does not create a command).
	 *
	 * Prefer `updateStyle(style).apply(editor)`.
	 */
	forceStyle(style: ComponentStyle, editor: Editor | null): void;

	isRestylableComponent: true;
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

	public description(editor: Editor, localizationTable: EditorLocalization): string {
		return localizationTable.restyledElement(
			this.getComponent(editor).description(localizationTable),
		);
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
				throw new Error(`json.id is of type ${typeof json.id}, not string.`);
			}

			return new DefaultRestyleComponentCommand(origStyle, newStyle, id);
		});
	}
}
