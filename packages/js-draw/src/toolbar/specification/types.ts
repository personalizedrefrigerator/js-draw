import ReactiveValue, { MutableReactiveValue } from '../../util/ReactiveValue';
import { Color4 } from '@js-draw/math';
import { IconSpec } from './icon';

export enum ToolbarWidgetType {
	ActionButton,
	MenuButton,
	ToolButton,

	ToggleButton,
	ColorInput,
	NumberInput,
	EnumInput,

	CustomHTML,
}

export interface LabelType {
	title: string;
	icon: ReactiveValue<IconSpec>|null;
}

// @internal
export interface BaseWidgetSpec {
	label: LabelType;
	disabled?: ReactiveValue<boolean>;

	/**
	 * A list of `string`s that identifies the tool widget to themes.
	 *
	 * For example, `"undo"` for an undo button, `"redo"` for a redo button,
	 * or `"pen"` for a pen.
	 *
	 * This allows themes to display common tools/buttons in theme-specific locations.
	 */
	keys?: string[];
}

/**
 * A button that, when clicked, does some kind of action.
 */
export interface ActionButtonSpec extends BaseWidgetSpec {
	kind: ToolbarWidgetType.ActionButton;

	/** Action to be done when the button is clicked. */
	action: ()=>void;
}

/**
 * A toolbar button that when clicked hides/shows a menu.
 */
export interface MenuButtonSpec extends BaseWidgetSpec {
	kind: ToolbarWidgetType.MenuButton;

	menu: ToolbarMenuSpec;
}

/**
 * A button that controls a single {@link BaseTool} subclass.
 */
export interface ToolButtonSpec extends BaseWidgetSpec {
	kind: ToolbarWidgetType.ToolButton;

	/**
	 * This value may be both read and written to by the toolbar.
	 */
	toolEnabled: MutableReactiveValue<boolean>;

	/** `null` if the tool has no submenu. */
	menu: ToolbarMenuSpec|null;
}

interface BaseInputWidgetSpec<InputValueType> extends BaseWidgetSpec {
	value: MutableReactiveValue<InputValueType>;
}

export interface ToggleButtonSpec extends BaseInputWidgetSpec<boolean> {
	kind: ToolbarWidgetType.ToggleButton;
}

export interface ColorInputSpec extends BaseInputWidgetSpec<Color4> {
	kind: ToolbarWidgetType.ColorInput;
}

export enum NumberInputType {
	Slider='slider',
	Textbox='textbox',
}

export interface NumberInputSpec extends BaseInputWidgetSpec<number> {
	kind: ToolbarWidgetType.NumberInput;

	preferredType: NumberInputType;

	min?: number;
	max?: number;
	step?: number;

	/** `true` iff the slider should be on a logarithmic scale. */
	logScale?: boolean;
}

export interface EnumInputChoice {
	label: LabelType;
	key: string;
}

export interface EnumInputSpec extends BaseInputWidgetSpec<string> {
	kind: ToolbarWidgetType.EnumInput;

	choices: ReactiveValue<EnumInputChoice[]>;
}

export interface CustomHTMLSpec {
	kind: ToolbarWidgetType.CustomHTML;

	element: ()=>HTMLElement;
}

export type ToolbarWidgetSpec =
	ActionButtonSpec|MenuButtonSpec|ToolButtonSpec|ToggleButtonSpec|ColorInputSpec|NumberInputSpec|EnumInputSpec|CustomHTMLSpec;

export interface ToolbarMenuSpec {
	open: MutableReactiveValue<boolean>;
	items: ReactiveValue<ToolbarWidgetSpec[]>;
}

export interface ToolbarSpec {
	items: ReactiveValue<ToolbarWidgetSpec[]>;
}
