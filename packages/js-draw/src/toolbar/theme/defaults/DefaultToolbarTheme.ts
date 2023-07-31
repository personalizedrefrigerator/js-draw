import ReactiveValue from '../../util/ReactiveValue';
import type Editor from '../../Editor';
import { ActionButtonSpec, BaseWidgetSpec, ColorInputSpec, EnumInputSpec, MenuButtonSpec, NumberInputSpec, ToggleButtonSpec, ToolButtonSpec, ToolbarSpec, ToolbarWidgetSpec, ToolbarWidgetType } from '../specification/types';
import DefaultIconTheme from './defaults/DefaultIconTheme';
import { IconSpec } from '../specification/icon';

const createItemContainer = () => document.createElement('div');

export default class BaseToolbarTheme {
	#listenerReferences: Array<{ remove(): void }> = [];
	#created: boolean = false;
	protected toolbarContainer: HTMLElement|null = null;
	protected iconTheme: DefaultIconTheme;

	public constructor(protected editor: Editor, protected spec: ToolbarSpec) {
		this.iconTheme = new DefaultIconTheme();
	}

	/**
	 * Adds `listener` to the list of resources that will be cleaned up when
	 * `destroy` is called.
	 */
	protected trackListener(listener: { remove(): void }) {
		this.#listenerReferences.push(listener);
	}

	protected watch<T>(value: ReactiveValue<T>, onUpdate: (t: T)=>void) {
		this.trackListener(
			value.onUpdateAndNow(onUpdate)
		);
	}

	public create() {
		// If already created,
		if (this.#created) {
			return;
		}
		this.#created = true;

		this.toolbarContainer = document.createElement('div');

		this.trackListener(this.spec.items.onUpdateAndNow(items => {
			this.buildAllToolbarItems(items);
		}));
	}

	protected buildAllToolbarItems(items: ToolbarWidgetSpec[]) {
		if (!this.toolbarContainer) {
			return;
		}

		const children: Element[] = [];
		for (const item of items) {
			children.push(this.buildItem(item));
		}

		this.toolbarContainer.replaceChildren(...children);
	}

	protected buildItem(spec: ToolbarWidgetSpec): Element {
		let exhaustivenessCheck: never;
		switch(spec.kind) {
		case ToolbarWidgetType.ActionButton:
			return this.buildActionButton(spec);
		case ToolbarWidgetType.MenuButton:
			return this.buildMenuButton(spec);
		case ToolbarWidgetType.ToolButton:
			return this.buildToolButton(spec);
		case ToolbarWidgetType.ToggleButton:
			return this.buildToggleButton(spec);
		case ToolbarWidgetType.ColorInput:
			return this.buildColorInput(spec);
		case ToolbarWidgetType.NumberInput:
			return this.buildNumberInput(spec);
		case ToolbarWidgetType.EnumInput:
			return this.buildEnumInput(spec);
		case ToolbarWidgetType.CustomHTML:
			return spec.element();
		}

		exhaustivenessCheck = spec;
		return exhaustivenessCheck;
	}

	protected buildIcon(iconSpec: ReactiveValue<IconSpec>) {
		const container = document.createElement('div');
		container.classList.add('icon-container');

		this.watch(iconSpec, spec => {
			container.replaceChildren(this.iconTheme.renderIcon(spec));
		});

		return container;
	}

	protected buildActionButton(spec: ActionButtonSpec): Element {
		const container = createItemContainer();
		container.setAttribute('role', 'button');

		if (spec.label.icon) {
			container.appendChild(this.buildIcon(spec.label.icon));
		} else {
			container.appendChild(document.createTextNode(spec.label.title));
		}

		if (spec.disabled) {
			this.watch(spec.disabled, disabled => {
				if (disabled) {
					container.classList.add('disabled');
				} else {
					container.classList.remove('disabled');
				}
			});
		}

		return container;
	}

	protected buildMenuButton(spec: MenuButtonSpec): Element {

	}

	protected buildToolButton(spec: ToolButtonSpec): Element {

	}

	protected buildToggleButton(spec: ToggleButtonSpec): Element {

	}

	protected buildColorInput(spec: ColorInputSpec): Element {

	}

	protected buildNumberInput(spec: NumberInputSpec): Element {

	}

	protected buildEnumInput(spec: EnumInputSpec): Element {

	}

	/** Removes the toolbar and disconnects it from the editor. */
	public destroy() {
		// If non-existent,
		if (!this.#created) {
			return;
		}

		this.#created = false;
		for (const listener of this.#listenerReferences) {
			listener.remove();
		}
		this.#listenerReferences = [];

		this.toolbarContainer?.remove();
		this.toolbarContainer = null;
	}
}
