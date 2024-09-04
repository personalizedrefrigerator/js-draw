import Editor from '../Editor';
import { defaultToolbarLocalization, ToolbarLocalization } from './localization';
import BaseWidget from './widgets/BaseWidget';
import OverflowWidget from './widgets/OverflowWidget';
import AbstractToolbar, { SpacerOptions } from './AbstractToolbar';
import { toolbarCSSPrefix } from './constants';

/**
 * @example
 *
 * ```ts,runnable
 * import { makeDropdownToolbar, Editor } from 'js-draw';
 *
 * const editor = new Editor(document.body);
 * const toolbar = makeDropdownToolbar(editor);
 * toolbar.addDefaults();
 *
 * toolbar.addExitButton(editor => {
 *   // TODO
 * });
 *
 * toolbar.addSaveButton(editor => {
 *   // TODO
 * });
 * ```
 *
 * Returns a subclass of {@link AbstractToolbar}.
 *
 * @see
 * - {@link makeEdgeToolbar}
 * - {@link AbstractToolbar.addSaveButton}
 * - {@link AbstractToolbar.addExitButton}
 */
export const makeDropdownToolbar = (editor: Editor): DropdownToolbar => {
	return new DropdownToolbar(editor, editor.getRootElement());
};

export default class DropdownToolbar extends AbstractToolbar {
	protected container: HTMLElement;
	private resizeObserver: ResizeObserver;

	// Flex-order of the next widget to be added.
	private widgetOrderCounter: number = 0;

	// Widget to toggle overflow menu.
	private overflowWidget: OverflowWidget | null = null;

	/** @internal */
	public constructor(
		editor: Editor,
		parent: HTMLElement,
		localizationTable: ToolbarLocalization = defaultToolbarLocalization,
	) {
		super(editor, localizationTable);

		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}root`);
		this.container.classList.add(`${toolbarCSSPrefix}element`);
		this.container.classList.add(`${toolbarCSSPrefix}dropdown-toolbar`);
		this.container.setAttribute('role', 'toolbar');
		parent.appendChild(this.container);

		if ('ResizeObserver' in window) {
			this.resizeObserver = new ResizeObserver((_entries) => {
				this.reLayout();
			});
			this.resizeObserver.observe(this.container);
		} else {
			console.warn('ResizeObserver not supported. Toolbar will not resize.');
		}
	}

	private reLayoutQueued: boolean = false;
	private queueReLayout() {
		if (!this.reLayoutQueued) {
			this.reLayoutQueued = true;
			requestAnimationFrame(() => this.reLayout());
		}
	}

	private reLayout() {
		this.reLayoutQueued = false;

		if (!this.overflowWidget) {
			return;
		}

		const getTotalWidth = (widgetList: Array<BaseWidget>) => {
			let totalWidth = 0;
			for (const widget of widgetList) {
				if (!widget.isHidden()) {
					totalWidth += widget.getButtonWidth();
				}
			}

			return totalWidth;
		};

		// Returns true if there is enough empty space to move the first child
		// from the overflow menu to the main menu.
		const canRemoveFirstChildFromOverflow = (freeSpaceInMainMenu: number) => {
			const overflowChildren = this.overflowWidget?.getChildWidgets() ?? [];

			if (overflowChildren.length === 0) {
				return false;
			}

			return overflowChildren[0].getButtonWidth() <= freeSpaceInMainMenu;
		};

		const allWidgets = this.getAllWidgets();

		let overflowWidgetsWidth = getTotalWidth(this.overflowWidget.getChildWidgets());
		let shownWidgetWidth = getTotalWidth(allWidgets) - overflowWidgetsWidth;
		let availableWidth = this.container.clientWidth * 0.87;

		// If on a device that has enough vertical space, allow
		// showing two rows of buttons.
		// TODO: Fix magic numbers
		if (window.innerHeight > availableWidth * 1.75) {
			availableWidth *= 1.75;
		}

		let updatedChildren = false;

		// If we can remove at least one child from the overflow menu,
		if (canRemoveFirstChildFromOverflow(availableWidth - shownWidgetWidth)) {
			// Move widgets to the main menu.
			const overflowChildren = this.overflowWidget.clearChildren();

			for (const child of overflowChildren) {
				child.addTo(this.container);
				child.setIsToplevel(true);

				if (!child.isHidden()) {
					shownWidgetWidth += child.getButtonWidth();
				}
			}

			overflowWidgetsWidth = 0;
			updatedChildren = true;
		}

		if (shownWidgetWidth >= availableWidth) {
			// Move widgets to the overflow menu.

			// Start with the rightmost widget, move to the leftmost
			for (let i = allWidgets.length - 1; i >= 0 && shownWidgetWidth >= availableWidth; i--) {
				const child = allWidgets[i];

				if (this.overflowWidget.hasAsChild(child)) {
					continue;
				}

				if (child.canBeInOverflowMenu()) {
					shownWidgetWidth -= child.getButtonWidth();
					this.overflowWidget.addToOverflow(child);
				}
			}

			updatedChildren = true;
		}

		// Hide/show the overflow widget.
		this.overflowWidget.setHidden(this.overflowWidget.getChildWidgets().length === 0);

		if (updatedChildren) {
			this.setupColorPickers();
		}
	}

	protected override addWidgetInternal(widget: BaseWidget) {
		const container = widget.addTo(this.container);

		// Ensure that the widget gets displayed in the correct
		// place in the toolbar, even if it's removed and re-added.
		container.style.order = `${this.widgetOrderCounter++}`;

		this.queueReLayout();
	}

	protected override removeWidgetInternal(widget: BaseWidget): void {
		widget.remove();
		this.queueReLayout();
	}

	public override addSpacer(options: Partial<SpacerOptions> = {}) {
		const spacer = document.createElement('div');
		spacer.classList.add(`${toolbarCSSPrefix}spacer`);

		if (options.grow) {
			spacer.style.flexGrow = `${options.grow}`;
		}

		if (options.minSize) {
			spacer.style.minWidth = options.minSize;
		}

		if (options.maxSize) {
			spacer.style.maxWidth = options.maxSize;
		}

		spacer.style.order = `${this.widgetOrderCounter++}`;
		this.container.appendChild(spacer);
	}

	/**
	 * Adds a widget that toggles the overflow menu. Call `addOverflowWidget` to ensure
	 * that this widget is in the correct space (if shown).
	 *
	 * @example
	 * ```ts
	 * toolbar.addDefaultToolWidgets();
	 * toolbar.addOverflowWidget();
	 * toolbar.addDefaultActionButtons();
	 * ```
	 * shows the overflow widget between the default tool widgets and the default action buttons,
	 * if shown.
	 */
	public addOverflowWidget() {
		this.overflowWidget = new OverflowWidget(this.editor, this.localizationTable);
		this.addWidget(this.overflowWidget);
	}

	/**
	 * Adds both the default tool widgets and action buttons. Equivalent to
	 * ```ts
	 * toolbar.addDefaultToolWidgets();
	 * toolbar.addOverflowWidget();
	 * toolbar.addDefaultActionButtons();
	 * ```
	 */
	public addDefaults() {
		this.addDefaultToolWidgets();
		this.addOverflowWidget();
		this.addDefaultActionButtons();
	}

	protected override onRemove() {
		this.container.remove();
		this.resizeObserver.disconnect();
	}
}
