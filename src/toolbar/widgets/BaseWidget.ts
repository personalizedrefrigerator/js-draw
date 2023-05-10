import Editor from '../../Editor';
import { DispatcherEventListener } from '../../EventDispatcher';
import ToolbarShortcutHandler from '../../tools/ToolbarShortcutHandler';
import { EditorEventType, InputEvtType, KeyPressEvent } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { ToolbarLocalization } from '../localization';

export type SavedToolbuttonState = Record<string, any>;

export default abstract class BaseWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element|null;
	private dropdownContainer: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;
	#hasDropdown: boolean;
	private disabled: boolean = false;

	// Maps subWidget IDs to subWidgets.
	private subWidgets: Record<string, BaseWidget> = {};

	private toplevel: boolean = true;
	protected readonly localizationTable: ToolbarLocalization;

	public constructor(
		protected editor: Editor,
		protected id: string,
		localizationTable?: ToolbarLocalization,
	) {
		this.localizationTable = localizationTable ?? editor.localization;

		this.icon = null;
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');
		this.#hasDropdown = false;

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');
		this.button.tabIndex = 0;

		const toolbarShortcutHandlers = this.editor.toolController.getMatchingTools(ToolbarShortcutHandler);

		// If the onKeyPress function has been extended and the editor is configured to send keypress events to
		// toolbar widgets,
		if (toolbarShortcutHandlers.length > 0 && this.onKeyPress !== BaseWidget.prototype.onKeyPress) {
			toolbarShortcutHandlers[0].registerListener(event => this.onKeyPress(event));
		}
	}

	public getId(): string {
		return this.id;
	}

	/**
	 * Returns the ID of this widget in `container`. Adds a suffix to this' ID
	 * if an item in `container` already has this' ID.
	 *
	 * For example, if `this` has ID `foo` and if
	 * `container = { 'foo': somethingNotThis, 'foo-1': somethingElseNotThis }`, this method
	 * returns `foo-2` because elements with IDs `foo` and `foo-1` are already present in
	 * `container`.
	 */
	public getUniqueIdIn(container: Record<string, BaseWidget>): string {
		let id = this.getId();
		let idCounter = 0;

		while (id in container && container[id] !== this) {
			id = this.getId() + '-' + idCounter.toString();
			idCounter ++;
		}

		return id;
	}

	protected abstract getTitle(): string;
	protected abstract createIcon(): Element|null;

	// Add content to the widget's associated dropdown menu.
	// Returns true if such a menu should be created, false otherwise.
	protected fillDropdown(dropdown: HTMLElement): boolean {
		if (Object.keys(this.subWidgets).length === 0) {
			return false;
		}

		for (const widgetId in this.subWidgets) {
			const widget = this.subWidgets[widgetId];

			widget.addTo(dropdown);
			widget.setIsToplevel(false);
		}
		return true;
	}

	protected setupActionBtnClickListener(button: HTMLElement) {
		const clickTriggers = { Enter: true, ' ': true, };
		button.onkeydown = (evt) => {
			let handled = false;

			if (evt.key in clickTriggers) {
				if (!this.disabled) {
					this.handleClick();
					handled = true;
				}
			}

			// If we didn't do anything with the event, send it to the editor.
			if (!handled) {
				handled = this.editor.toolController.dispatchInputEvent({
					kind: InputEvtType.KeyPressEvent,
					key: evt.key,
					ctrlKey: evt.ctrlKey || evt.metaKey,
					altKey: evt.altKey,
				});
			}

			if (handled) {
				evt.preventDefault();
			}
		};

		button.onkeyup = evt => {
			if (evt.key in clickTriggers) {
				return;
			}

			const handled = this.editor.toolController.dispatchInputEvent({
				kind: InputEvtType.KeyUpEvent,
				key: evt.key,
				ctrlKey: evt.ctrlKey || evt.metaKey,
				altKey: evt.altKey,
			});

			if (handled) {
				evt.preventDefault();
			}
		};

		button.onclick = () => {
			if (!this.disabled) {
				this.handleClick();
			}
		};
	}

	// Add a listener that is triggered when a key is pressed.
	// Listeners will fire regardless of whether this widget is selected and require that
	// {@link Editor.toolController} to have an enabled {@link ToolbarShortcutHandler} tool.
	protected onKeyPress(_event: KeyPressEvent): boolean {
		return false;
	}

	protected abstract handleClick(): void;

	protected get hasDropdown() {
		return this.#hasDropdown;
	}

	// Add a widget to this' dropdown. Must be called before this.addTo.
	protected addSubWidget(widget: BaseWidget) {
		// Generate a unique ID for the widget.
		const id = widget.getUniqueIdIn(this.subWidgets);

		this.subWidgets[id] = widget;
	}

	private toolbarWidgetToggleListener: DispatcherEventListener|null = null;

	/**
	 * Adds this to `parent`. This can only be called once for each ToolbarWidget.
	 * Returns the element that was just added to `parent`.
	 * @internal
	 */
	public addTo(parent: HTMLElement) {
		// Update title and icon
		this.icon = null;
		this.updateIcon();
		this.label.innerText = this.getTitle();

		const longLabelCSSClass = 'long-label';
		if (this.label.innerText.length > 7) {
			this.label.classList.add(longLabelCSSClass);
		} else {
			this.label.classList.remove(longLabelCSSClass);
		}

		// Click functionality
		this.setupActionBtnClickListener(this.button);

		// Clear anything already in this.container.
		this.container.replaceChildren();

		this.button.replaceChildren(this.icon!, this.label);
		this.container.appendChild(this.button);

		this.#hasDropdown = this.fillDropdown(this.dropdownContainer);
		if (this.#hasDropdown) {
			this.dropdownIcon = this.createDropdownIcon();
			this.button.appendChild(this.dropdownIcon);
			this.container.appendChild(this.dropdownContainer);

			if (this.toolbarWidgetToggleListener) {
				this.toolbarWidgetToggleListener.remove();
			}

			this.toolbarWidgetToggleListener = this.editor.notifier.on(EditorEventType.ToolbarDropdownShown, (evt) => {
				if (
					evt.kind === EditorEventType.ToolbarDropdownShown
					&& evt.parentWidget !== this

					// Don't hide if a submenu wash shown (it might be a submenu of
					// the current menu).
					&& evt.parentWidget.toplevel
				) {
					this.setDropdownVisible(false);
				}
			});
		}

		this.setDropdownVisible(false);

		if (this.container.parentElement) {
			this.container.remove();
		}

		parent.appendChild(this.container);
		return this.container;
	}


	protected updateIcon() {
		const newIcon = this.createIcon();

		if (newIcon) {
			this.icon?.replaceWith(newIcon);
			this.icon = newIcon;
			this.icon.classList.add(`${toolbarCSSPrefix}icon`);
		} else {
			this.icon?.remove();
		}
	}

	public setDisabled(disabled: boolean) {
		this.disabled = disabled;

		if (this.disabled) {
			this.button.classList.add('disabled');
			this.button.setAttribute('aria-disabled', 'true');
		} else {
			this.button.classList.remove('disabled');
			this.button.removeAttribute('aria-disabled');
		}
	}

	public setSelected(selected: boolean) {
		const currentlySelected = this.isSelected();
		if (currentlySelected === selected) {
			return;
		}

		// Ensure that accessibility tools check and read the value of
		// aria-checked.
		// TODO: Ensure that 'role' is set to 'switch' by default for selectable
		//       buttons.
		this.button.setAttribute('role', 'switch');

		if (selected) {
			this.container.classList.add('selected');
			this.button.setAttribute('aria-checked', 'true');
		} else {
			this.container.classList.remove('selected');
			this.button.setAttribute('aria-checked', 'false');
		}
	}

	private hideDropdownTimeout: any|null = null;

	protected setDropdownVisible(visible: boolean) {
		const currentlyVisible = this.container.classList.contains('dropdownVisible');
		if (currentlyVisible === visible) {
			return;
		}

		// If waiting to hide the dropdown, cancel it.
		if (this.hideDropdownTimeout) {
			clearTimeout(this.hideDropdownTimeout);
			this.hideDropdownTimeout = null;
		}


		const animationDuration = 150; // ms

		if (visible) {
			this.dropdownContainer.classList.remove('hidden');
			this.container.classList.add('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownShown(this.getTitle())
			);

			this.editor.notifier.dispatch(EditorEventType.ToolbarDropdownShown, {
				kind: EditorEventType.ToolbarDropdownShown,
				parentWidget: this,
			});
		} else {
			this.container.classList.remove('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownHidden(this.getTitle())
			);

			// Allow the dropdown's hiding animation to run — don't hide immediately.
			this.hideDropdownTimeout = setTimeout(() => {
				this.dropdownContainer.classList.add('hidden');
			}, animationDuration);
		}

		// Animate
		const animationName = `var(--dropdown-${
			visible ? 'show' : 'hide'
		}-animation)`;
		this.dropdownContainer.style.animation = `${animationDuration}ms ease ${animationName}`;

		this.repositionDropdown();
	}

	public canBeInOverflowMenu(): boolean {
		return true;
	}

	public getButtonWidth(): number {
		return this.button.clientWidth;
	}

	public isHidden(): boolean {
		return this.container.style.display === 'none';
	}

	public setHidden(hidden: boolean) {
		this.container.style.display = hidden ? 'none' : '';
	}

	protected repositionDropdown() {
		const dropdownBBox = this.dropdownContainer.getBoundingClientRect();
		const screenWidth = document.body.clientWidth;

		if (dropdownBBox.left > screenWidth / 2) {
			// Use .translate so as not to conflict with CSS animating the
			// transform property.
			this.dropdownContainer.style.translate = `calc(${this.button.clientWidth + 'px'} - 100%) 0`;
		} else {
			this.dropdownContainer.style.transform = '';
		}
	}

	/** Set whether the widget is contained within another. @internal */
	public setIsToplevel(toplevel: boolean) {
		this.toplevel = toplevel;
	}

	protected isDropdownVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}

	protected isSelected(): boolean {
		return this.container.classList.contains('selected');
	}

	private createDropdownIcon(): Element {
		const icon = this.editor.icons.makeDropdownIcon();
		icon.classList.add(`${toolbarCSSPrefix}showHideDropdownIcon`);
		return icon;
	}

	/**
	 * Serialize state associated with this widget.
	 * Override this method to allow saving/restoring from state on application load.
	 *
	 * Overriders should call `super` and include the output of `super.serializeState` in
	 * the output dictionary.
	 *
	 * Clients should not rely on the output from `saveState` being in any particular
	 * format.
	 */
	public serializeState(): SavedToolbuttonState {
		const subwidgetState: Record<string, any> = {};

		// Save all subwidget state.
		for (const subwidgetId in this.subWidgets) {
			subwidgetState[subwidgetId] = this.subWidgets[subwidgetId].serializeState();
		}

		return {
			subwidgetState,
		};
	}

	/**
	 * Restore widget state from serialized data. See also `saveState`.
	 *
	 * Overriders must call `super`.
	 */
	public deserializeFrom(state: SavedToolbuttonState): void {
		if (state.subwidgetState) {
			// Deserialize all subwidgets.
			for (const subwidgetId in state.subwidgetState) {
				if (subwidgetId in this.subWidgets) {
					this.subWidgets[subwidgetId].deserializeFrom(state.subwidgetState[subwidgetId]);
				}
			}
		}
	}
}
