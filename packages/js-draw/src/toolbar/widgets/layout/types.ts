import ReactiveValue from 'js-draw/src/util/ReactiveValue';

/**
 * A class that manages whether/what content is shown for a widget.
 *
 * This might be a dropdown menu or a sidebar.
 *
 * TODO: Shouldn't be an interface, unless always internal.
 * @internal
 */
export interface ToolMenu {
	/**
	 * Request that the layout manager show the dropdown. In general,
	 * this makes the content of the dropdown visible.
	 */
	requestShow(): void;

	/**
	 * Request that the layout manager hide the dropdown. Even after calling this,
	 * the dropdown may still be visible.
	 */
	requestHide(): void;

	/** Whether the dropdown is visible (not hidden). */
	readonly visible: ReactiveValue<boolean>;

	/** Note that the tool associated with this dropdown has been activated. */
	onActivated(): void;

	/** Adds the given `child` to the content of the dropdown. */
	appendChild(child: HTMLElement): void;

	/** Removes all children from this dropdown. */
	clearChildren(): void;

	/**
	 * Destroy the dropdown and remove it from the document. This should be called when
	 * the creator of the dropdown is destroyed.
	 */
	destroy(): void;
}

/**
 * Provides information about the element a tool menu is attached to.
 */
export interface ToolMenuParent {
	/** The dropdown may be added **after** this element. */
	target: HTMLElement;

	/**
	 * @returns the title of the element the dropdown is associated with.
	 *
	 * This is used for accessibility announcements (and possibly to display
	 * a heading).
	 */
	getTitle(): string;

	/**
	 * Returns true iff the parent is a toplevel element (not contained within
	 * a ContentLayoutManager of the same type as the current).
	 */
	isToplevel(): boolean;
}

export interface WidgetContentLayoutManager {
	/**
	 * Creates a tool menu (e.g. a dropdown). The dropdown *may* be added to `parent` or addded
	 * elsewhere (this depends on the layout manager).
	 *
	 * Regardless, `parent` should be a place where an absolutely-positioned dropdown
	 * element could be added.
	 */
	createToolMenu(parent: ToolMenuParent): ToolMenu;
}
