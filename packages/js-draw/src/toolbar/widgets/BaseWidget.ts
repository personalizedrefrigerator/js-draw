import Editor from '../../Editor';
import ToolbarShortcutHandler from '../../tools/ToolbarShortcutHandler';
import { KeyPressEvent, keyPressEventFromHTMLEvent, keyUpEventFromHTMLEvent } from '../../inputEvents';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
import DropdownLayoutManager from './layout/DropdownLayoutManager';
import { ToolMenu, WidgetContentLayoutManager } from './layout/types';
import addLongPressOrHoverCssClasses from '../../util/addLongPressOrHoverCssClasses';
import HelpDisplay from '../utils/HelpDisplay';

export type SavedToolbuttonState = Record<string, any>;

/**
 * A set of labels that allow toolbar themes to treat buttons differently.
 */
export enum ToolbarWidgetTag {
	Save = 'save',
	Exit = 'exit',
	Undo = 'undo',
	Redo = 'redo',
}

/**
 * The `abstract` base class for items that can be shown in a `js-draw` toolbar. See also {@link AbstractToolbar.addWidget}.
 *
 * See [the custom tool example](https://github.com/personalizedrefrigerator/js-draw/blob/main/docs/examples/example-custom-tools/example.ts)
 * for how to create a custom toolbar widget for a tool.
 *
 * For custom action buttons, {@link AbstractToolbar.addActionButton} may be sufficient for most use cases.
 */
export default abstract class BaseWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element|null;
	private layoutManager: WidgetContentLayoutManager;
	private dropdown: ToolMenu|null = null;
	private dropdownContent: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;
	#hasDropdown: boolean;

	// True iff this widget is disabled.
	private disabled: boolean = false;

	// True iff this widget is currently disabled because the editor is read only
	#disabledDueToReadOnlyEditor: boolean = false;

	#tags: (ToolbarWidgetTag|string)[] = [];

	// Maps subWidget IDs to subWidgets.
	private subWidgets: Record<string, BaseWidget> = {};

	private toplevel: boolean = true;
	protected readonly localizationTable: ToolbarLocalization;

	#removeEditorListeners: (()=>void)|null = null;

	public constructor(
		protected editor: Editor,
		protected id: string,
		localizationTable?: ToolbarLocalization
	) {
		this.localizationTable = localizationTable ?? editor.localization;

		// Default layout manager
		const defaultLayoutManager = new DropdownLayoutManager(
			(text) => this.editor.announceForAccessibility(text),
			this.localizationTable
		);
		defaultLayoutManager.connectToEditorNotifier(editor.notifier);
		this.layoutManager = defaultLayoutManager;

		this.icon = null;
		this.container = document.createElement('div');
		this.container.classList.add(
			`${toolbarCSSPrefix}toolContainer`, `${toolbarCSSPrefix}toolButtonContainer`,
			`${toolbarCSSPrefix}internalWidgetId--${id.replace(/[^a-zA-Z0-9_]/g, '-')}`,
		);
		this.dropdownContent = document.createElement('div');
		this.#hasDropdown = false;

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');
		this.button.tabIndex = 0;

		// Disable the context menu. This allows long-press gestures to trigger the button's
		// tooltip instead.
		this.button.oncontextmenu = event => {
			event.preventDefault();
		};
		addLongPressOrHoverCssClasses(this.button);
	}

	#addEditorListeners() {
		this.#removeEditorListeners?.();

		const toolbarShortcutHandlers = this.editor.toolController.getMatchingTools(ToolbarShortcutHandler);
		let removeKeyPressListener: (()=>void)|null = null;

		// If the onKeyPress function has been extended and the editor is configured to send keypress events to
		// toolbar widgets,
		if (toolbarShortcutHandlers.length > 0 && this.onKeyPress !== BaseWidget.prototype.onKeyPress) {
			const keyPressListener = (event: KeyPressEvent) => this.onKeyPress(event);
			const handler = toolbarShortcutHandlers[0];
			handler.registerListener(keyPressListener);
			removeKeyPressListener = () => {
				handler.removeListener(keyPressListener);
			};
		}

		const readOnlyListener = this.editor.isReadOnlyReactiveValue().onUpdateAndNow(readOnly => {
			if (readOnly && this.shouldAutoDisableInReadOnlyEditor() && !this.disabled) {
				this.setDisabled(true);
				this.#disabledDueToReadOnlyEditor = true;

				if (this.#hasDropdown) {
					this.dropdown?.requestHide();
				}
			}
			else if (!readOnly && this.#disabledDueToReadOnlyEditor) {
				this.#disabledDueToReadOnlyEditor = false;
				this.setDisabled(false);
			}
		});

		this.#removeEditorListeners = () => {
			readOnlyListener.remove();
			removeKeyPressListener?.();

			this.#removeEditorListeners = null;
		};
	}

	/**
	 * Should return a constant true or false value. If true (the default),
	 * this widget must be automatically disabled when its editor is read-only.
	 */
	protected shouldAutoDisableInReadOnlyEditor() {
		return true;
	}

	public getId(): string {
		return this.id;
	}

	/**
	 * Note: Tags should be set *before* a tool widget is added to a toolbar.
	 *
	 *
	 * Associates tags with this widget that can be used by toolbar themes
	 * to customize the layout/appearance of this button. Prefer tags in
	 * the `ToolbarWidgetTag` enum, where possible.
	 *
	 * In addition to being readable from the {@link getTags} method, tags are
	 * added to a button's main container as CSS classes with the `toolwidget-tag--` prefix.
	 *
	 * For example, the `undo` tag would result in `toolwidget-tag--undo`
	 * being added to the button's container's class list.
	 *
	 */
	public setTags(tags: (string|ToolbarWidgetTag)[]) {
		const toClassName = (tag: string) => {
			return `toolwidget-tag--${tag}`;
		};

		// Remove CSS classes associated with old tags
		for (const tag of this.#tags) {
			this.container.classList.remove(toClassName(tag));
		}

		this.#tags = [...tags];

		// Add new CSS classes
		for (const tag of this.#tags) {
			this.container.classList.add(toClassName(tag));
		}
	}

	public getTags() {
		return [ ...this.#tags ];
	}

	/**
	 * Returns the ID of this widget in `container`. Adds a suffix to this' ID
	 * if an item in `container` already has this' ID.
	 *
	 * For example, if `this` has ID `foo` and if
	 * `container = { 'foo': somethingNotThis, 'foo-1': somethingElseNotThis }`, this method
	 * returns `foo-2` because elements with IDs `foo` and `foo-1` are already present in
	 * `container`.
	 *
	 * If `this` is already in `container`, returns the id given to `this` in the container.
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
	protected fillDropdown(dropdown: HTMLElement, helpDisplay?: HelpDisplay): boolean {
		if (Object.keys(this.subWidgets).length === 0) {
			return false;
		}

		for (const widgetId in this.subWidgets) {
			const widget = this.subWidgets[widgetId];

			const widgetElement = widget.addTo(dropdown);
			widget.setIsToplevel(false);

			// Add help information
			const helpText = widget.getHelpText();
			if (helpText) {
				helpDisplay?.registerTextHelpForElement(
					widgetElement, helpText,
				);
			}
		}
		return true;
	}

	/**
	 * Should return a 1-2 sentence description of the widget.
	 *
	 * At present, this is only used if this widget has an associated dropdown.
	 */
	protected getHelpText(): undefined|string {
		return undefined;
	}

	/** @deprecated Renamed to `setUpButtonEventListeners`. */
	protected setupActionBtnClickListener(button: HTMLElement) {
		return this.setUpButtonEventListeners(button);
	}

	protected setUpButtonEventListeners(button: HTMLElement) {
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
				const editorEvent = keyPressEventFromHTMLEvent(evt);
				handled = this.editor.toolController.dispatchInputEvent(editorEvent);
			}

			if (handled) {
				evt.preventDefault();
			}
		};

		button.onkeyup = htmlEvent => {
			if (htmlEvent.key in clickTriggers) {
				return;
			}

			const event = keyUpEventFromHTMLEvent(htmlEvent);
			const handled = this.editor.toolController.dispatchInputEvent(event);

			if (handled) {
				htmlEvent.preventDefault();
			}
		};

		button.onclick = () => {
			if (!this.disabled) {
				this.handleClick();
			}
		};

		// Prevent double-click zoom on some devices.
		button.ondblclick = event => {
			event.preventDefault();
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

	public setLayoutManager(manager: WidgetContentLayoutManager) {
		if (manager === this.layoutManager) {
			return;
		}

		this.layoutManager = manager;
		if (this.container.parentElement) {
			// Trigger a re-creation of this' content
			this.addTo(this.container.parentElement);
		}
	}


	/**
	 * Adds this to `parent`.
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
		this.setUpButtonEventListeners(this.button);

		// Clear anything already in this.container.
		this.container.replaceChildren();

		this.button.replaceChildren(this.icon!, this.label);
		this.container.appendChild(this.button);

		const helpDisplay = new HelpDisplay(
			content => this.editor.createHTMLOverlay(content),
			this.editor,
		);
		const helpText = this.getHelpText();
		if (helpText) {
			helpDisplay.registerTextHelpForElement(
				this.dropdownContent,
				[ this.getTitle(), helpText ].join('\n\n'),
			);
		}

		// Clear the dropdownContainer in case this element is being moved to another
		// parent.
		this.dropdownContent.replaceChildren();
		this.#hasDropdown = this.fillDropdown(this.dropdownContent, helpDisplay);

		if (this.#hasDropdown) {
			this.button.classList.add('has-dropdown');

			// We're re-creating the dropdown.
			this.dropdown?.destroy();

			this.dropdownIcon = this.createDropdownIcon();
			this.button.appendChild(this.dropdownIcon);

			this.dropdown = this.layoutManager.createToolMenu({
				target: this.button,
				getTitle: () => this.getTitle(),
				isToplevel: () => this.toplevel,
			});

			this.dropdown.visible.onUpdate(visible => {
				if (visible) {
					this.container.classList.add('dropdownVisible');
				} else {
					this.container.classList.remove('dropdownVisible');
				}

				// Auto-focus this component's button when the dropdown hides --
				// this ensures that keyboard focus goes to a reasonable location when
				// the user closes a menu.
				if (!visible) {
					this.focus();
				}
			});

			if (helpDisplay.hasHelpText()) {
				this.dropdown.appendChild(helpDisplay.createToggleButton());
			}
			this.dropdown.appendChild(this.dropdownContent);
		}

		this.setDropdownVisible(false);

		if (this.container.parentElement) {
			this.container.remove();
		}

		this.#addEditorListeners();

		parent.appendChild(this.container);
		return this.container;
	}

	/**
	 * Remove this. This allows the widget to be added to a toolbar again
	 * in the future using {@link addTo}.
	 */
	public remove() {
		this.container.remove();

		this.#removeEditorListeners?.();
	}

	public focus() {
		this.button.focus();
	}

	/**
	 * @internal
	 */
	public addCSSClassToContainer(className: string) {
		this.container.classList.add(className);
	}

	public removeCSSClassFromContainer(className: string) {
		this.container.classList.remove(className);
	}


	protected updateIcon() {
		let newIcon = this.createIcon();

		if (!newIcon) {
			newIcon = document.createElement('div');
			this.container.classList.add('no-icon');
		} else {
			this.container.classList.remove('no-icon');
		}

		this.icon?.replaceWith(newIcon);
		this.icon = newIcon;
		this.icon.classList.add(`${toolbarCSSPrefix}icon`);
	}

	public setDisabled(disabled: boolean) {
		this.disabled = disabled;
		this.#disabledDueToReadOnlyEditor = false;

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


	protected setDropdownVisible(visible: boolean) {
		if (visible) {
			this.dropdown?.requestShow();
		} else {
			this.dropdown?.requestHide();
		}
	}

	/**
	 * Only used by some layout managers.
	 * In those layout managers, makes this dropdown visible.
	 */
	protected activateDropdown() {
		this.dropdown?.onActivated();
	}

	/**
	 * Returns `true` if this widget must always be in a toplevel menu and not
	 * in a scrolling/overflow menu.
	 *
	 * This method can be overidden to override the default of `true`.
	 */
	public mustBeInToplevelMenu(): boolean {
		return false;
	}

	/**
	 * Returns true iff this widget can be in a nontoplevel menu.
	 *
	 * @deprecated Use `!mustBeInToplevelMenu()` instead.
	 */
	public canBeInOverflowMenu(): boolean {
		return !this.mustBeInToplevelMenu();
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

	/** Set whether the widget is contained within another. @internal */
	public setIsToplevel(toplevel: boolean) {
		this.toplevel = toplevel;
	}

	/** Returns true if the menu for this widget is open. */
	protected isDropdownVisible(): boolean {
		return this.dropdown?.visible?.get() ?? false;
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
