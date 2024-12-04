import Editor from '../Editor';
import { ToolbarLocalization } from './localization';
import BaseWidget, { ToolbarWidgetTag } from './widgets/BaseWidget';
import { toolbarCSSPrefix } from './constants';
import EdgeToolbarLayoutManager from './widgets/layout/EdgeToolbarLayoutManager';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';
import AbstractToolbar, { SpacerOptions } from './AbstractToolbar';
import stopPropagationOfScrollingWheelEvents from '../util/stopPropagationOfScrollingWheelEvents';
import makeDraggable from './utils/makeDraggable';

/**
 * Creates an `EdgeToolbar`.
 *
 * [Credit for the original design of this UI](https://www.figma.com/file/NA5F2AMWO3wUuaoDfUaAb8/Material-3-wireframes?type=design&node-id=54490%3A1103&mode=design&t=Ee0UwnPnQ2bNC2uM-1).
 *
 * @example
 *
 * ```ts,runnable
 * import { makeEdgeToolbar, Editor } from 'js-draw';
 *
 * const editor = new Editor(document.body);
 * const toolbar = makeEdgeToolbar(editor);
 * toolbar.addDefaults();
 *
 * toolbar.addSaveButton(editor => {
 *   // TODO
 * });
 *
 * toolbar.addExitButton(editor => {
 *   // TODO
 * });
 * ```
 *
 * @see
 * - {@link makeDropdownToolbar}
 * - {@link AbstractToolbar.addSaveButton}
 * - {@link AbstractToolbar.addExitButton}
 */
export const makeEdgeToolbar = (editor: Editor): AbstractToolbar => {
	return new EdgeToolbar(editor, editor.getRootElement(), editor.localization);
};

export default class EdgeToolbar extends AbstractToolbar {
	private toolbarContainer: HTMLElement;

	// Row that contains action buttons
	private toolbarActionRow: HTMLElement;

	// Row that contains tools
	private toolbarToolRow: HTMLElement;

	private toolRowResizeObserver: ResizeObserver;

	private menuContainer: HTMLElement;
	private sidebarContainer: HTMLElement;
	private sidebarContent: HTMLElement;
	private closeButton: HTMLElement;

	private layoutManager: EdgeToolbarLayoutManager;

	private sidebarVisible: MutableReactiveValue<boolean>;
	private sidebarY: MutableReactiveValue<number>;
	private sidebarTitle: MutableReactiveValue<string>;

	private clearDragListeners: (() => void) | null = null;

	/** @internal */
	public constructor(editor: Editor, parent: HTMLElement, localizationTable: ToolbarLocalization) {
		super(editor, localizationTable);

		this.toolbarContainer = document.createElement('div');
		this.toolbarContainer.classList.add(`${toolbarCSSPrefix}root`);
		this.toolbarContainer.classList.add(`${toolbarCSSPrefix}element`);
		this.toolbarContainer.classList.add(`${toolbarCSSPrefix}edge-toolbar`);
		this.toolbarContainer.setAttribute('role', 'toolbar');

		this.toolbarActionRow = document.createElement('div');
		this.toolbarActionRow.classList.add('toolbar-element', 'toolbar-action-row');
		this.toolbarToolRow = document.createElement('div');
		this.toolbarToolRow.classList.add('toolbar-element', 'toolbar-tool-row');

		stopPropagationOfScrollingWheelEvents(this.toolbarToolRow);

		if ('ResizeObserver' in window) {
			this.toolRowResizeObserver = new ResizeObserver((_entries) => {
				this.onToolbarRowResize();
			});
			this.toolRowResizeObserver.observe(this.toolbarToolRow);
		} else {
			console.warn('ResizeObserver not supported. Toolbar will not resize.');
		}

		this.toolbarContainer.replaceChildren(this.toolbarActionRow, this.toolbarToolRow);
		parent.appendChild(this.toolbarContainer);

		this.sidebarVisible = ReactiveValue.fromInitialValue(false);
		this.sidebarY = ReactiveValue.fromInitialValue(0);

		// Create the container elements
		this.menuContainer = document.createElement('div');
		this.menuContainer.classList.add(`${toolbarCSSPrefix}edgemenu-container`);

		this.sidebarContainer = document.createElement('div');
		this.sidebarContainer.classList.add(
			`${toolbarCSSPrefix}edgemenu`,
			`${toolbarCSSPrefix}element`,
		);
		this.sidebarContainer.classList.add(`${toolbarCSSPrefix}tool-properties`);

		this.sidebarContent = document.createElement('div');

		// Setup resizing/dragging
		this.sidebarY.onUpdateAndNow((y) => {
			const belowEdgeClassName = 'dropdown-below-edge';
			if (y > 0) {
				this.sidebarContainer.style.transform = `translate(0, ${y}px)`;
				this.sidebarContainer.style.paddingBottom = '';
				this.menuContainer.classList.add(belowEdgeClassName);
			} else {
				this.sidebarContainer.style.transform = '';
				this.sidebarContainer.style.paddingBottom = `${-y}px`;
				this.menuContainer.classList.remove(belowEdgeClassName);
			}
		});

		this.closeButton = document.createElement('button');
		this.closeButton.classList.add('drag-elem');

		// The close button has default focus -- forward its events to the main editor so that keyboard
		// shortcuts still work.
		this.editor.handleKeyEventsFrom(this.closeButton, (event) => {
			// Don't send
			return event.code !== 'Space' && event.code !== 'Enter' && event.code !== 'Tab';
		});

		// Close the sidebar when pressing escape
		this.sidebarContainer.addEventListener('keyup', (event) => {
			if (!event.defaultPrevented && event.code === 'Escape') {
				this.sidebarVisible.set(false);
				event.preventDefault();
			}
		});

		this.initDragListeners();

		// Initialize the layout manager
		const setSidebarContent = (...content: HTMLElement[]) => {
			this.sidebarContent.replaceChildren(...content);
			this.setupColorPickers();
		};

		this.sidebarTitle = MutableReactiveValue.fromInitialValue('');

		this.layoutManager = new EdgeToolbarLayoutManager(
			setSidebarContent,
			this.sidebarTitle,
			this.sidebarVisible,
			editor.announceForAccessibility.bind(editor),
			localizationTable,
		);

		this.sidebarTitle.onUpdateAndNow((title) => {
			this.closeButton.setAttribute('aria-label', localizationTable.closeSidebar(title));
		});

		// Make things visible/keep hidden.
		this.listenForVisibilityChanges();

		this.sidebarContainer.replaceChildren(this.closeButton, this.sidebarContent);
		this.menuContainer.replaceChildren(this.sidebarContainer);
		parent.appendChild(this.menuContainer);
	}

	private listenForVisibilityChanges() {
		let animationTimeout: ReturnType<typeof setTimeout> | null = null;
		const animationDuration = 170;

		if (!this.sidebarVisible.get()) {
			this.menuContainer.style.display = 'none';

			// Set the initial opacity to 0 to allow the `transition` property
			// to animate it to 1.
			this.menuContainer.style.opacity = '0';
		}

		const prefersReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? '';

		this.sidebarVisible.onUpdate((visible) => {
			const animationProperties = `${animationDuration}ms ease`;

			// We need to use different animations when reducing motion.
			const reduceMotion = prefersReduceMotion.matches ? '-reduce-motion' : '';

			if (visible) {
				this.sidebarY.set(this.snappedSidebarY());

				if (animationTimeout) {
					clearTimeout(animationTimeout);
					animationTimeout = null;
				}

				this.menuContainer.style.display = '';
				this.sidebarContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-edgemenu-transition-in${reduceMotion}`;
				this.menuContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-edgemenu-container-transition-in${reduceMotion}`;
				this.menuContainer.style.opacity = '1';

				// Focus the close button when first shown, but prevent scroll because the button
				// is likely at the bottom of the screen (and we want the full sidebar to remain
				// visible).
				this.closeButton.focus({ preventScroll: true });
			} else {
				this.closeColorPickers();

				if (animationTimeout === null) {
					this.sidebarContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-edgemenu-transition-out${reduceMotion}`;
					this.menuContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-edgemenu-container-transition-out${reduceMotion}`;

					// Manually set the container's opacity to prevent flickering when closing
					// the toolbar.
					this.menuContainer.style.opacity = '0';

					// Hide overflow -- don't show the part of the edge toolbar that's outside of
					// the editor.
					//this.menuContainer.style.overflowY = 'hidden';

					this.editor.announceForAccessibility(
						this.localizationTable.dropdownHidden(this.sidebarTitle.get()),
					);

					animationTimeout = setTimeout(() => {
						this.menuContainer.style.display = 'none';
						this.menuContainer.style.overflowY = '';
						animationTimeout = null;
					}, animationDuration);
				}
			}
		});
	}

	private onToolbarRowResize() {
		const setExtraPadding = () => {
			const visibleWidth = this.toolbarToolRow.clientWidth;

			// Determine whether extra spacing needs to be added so that one button is cut
			// in half. Ideally, when there is scroll, one button will be cut in half to show
			// that scrolling is possible.
			let currentWidth = 0;
			let extraPadding = 0;
			let numVisibleButtons = 0;
			for (const child of this.toolbarToolRow.children) {
				// Use the first child -- padding is applied around that child. Assumes
				// that the button's width is its height plus some padding.
				const buttonBaseSize = child.clientHeight;
				currentWidth += buttonBaseSize;
				numVisibleButtons++;

				if (currentWidth > visibleWidth) {
					// We want extraPadding + (currentWidth - buttonWidth / 2) = visibleWidth.
					// Thus, extraPadding = visibleWidth - currentWidth + buttonWidth / 2;
					extraPadding = visibleWidth - currentWidth + buttonBaseSize / 2;

					// Ensure that the padding is positive
					if (extraPadding < 0) {
						extraPadding += buttonBaseSize;
					}
					break;
				}
			}

			const perButtonPadding = Math.round((extraPadding / numVisibleButtons) * 10) / 10;
			this.toolbarToolRow.style.setProperty('--extra-left-right-padding', `${perButtonPadding}px`);
		};

		const actionRowBBox = this.toolbarActionRow.getBoundingClientRect();
		const toolbarRowBBox = this.toolbarToolRow.getBoundingClientRect();
		const onDifferentRows = actionRowBBox.y + actionRowBBox.height <= toolbarRowBBox.y;

		if (onDifferentRows) {
			this.toolbarContainer.classList.remove('one-row');
		} else {
			this.toolbarContainer.classList.add('one-row');
		}

		if (this.toolbarToolRow.clientWidth < this.toolbarToolRow.scrollWidth) {
			this.toolbarToolRow.classList.add('has-scroll');

			// Note: This can potentially change the size of the tool row.
			// Because this is run inside of a ResizeObserver callback, special
			// care must be taken to ensure that this change doesn't re-trigger
			// the resize observer.
			setExtraPadding();
		} else {
			this.toolbarToolRow.classList.remove('has-scroll', 'extra-padding');
		}
	}

	public override addSpacer(_options?: Partial<SpacerOptions>): void {
		//throw new Error('Method not implemented.');
		// Unused for this toolbar.
	}

	public override addUndoRedoButtons(): void {
		super.addUndoRedoButtons(false);
	}

	public override addDefaults(): void {
		this.addDefaultActionButtons();
		this.addDefaultToolWidgets();
	}

	private updateWidgetCSSClasses(widget: BaseWidget) {
		const tags = widget.getTags();
		widget.removeCSSClassFromContainer('label-inline');
		widget.removeCSSClassFromContainer('label-left');
		widget.removeCSSClassFromContainer('label-right');

		if (tags.includes(ToolbarWidgetTag.Save)) {
			widget.addCSSClassToContainer('label-inline');
			widget.addCSSClassToContainer('label-left');
		}

		if (tags.includes(ToolbarWidgetTag.Exit)) {
			widget.addCSSClassToContainer('label-inline');
			widget.addCSSClassToContainer('label-right');
		}
	}

	protected override addWidgetInternal(widget: BaseWidget) {
		this.updateWidgetCSSClasses(widget);

		widget.setLayoutManager(this.layoutManager);
		if (widget.mustBeInToplevelMenu()) {
			widget.addTo(this.toolbarActionRow);
		} else {
			widget.addTo(this.toolbarToolRow);
		}
	}

	protected override removeWidgetInternal(widget: BaseWidget): void {
		widget.remove();
	}

	protected override onRemove() {
		this.toolbarContainer.remove();
		this.menuContainer.remove();
		this.toolRowResizeObserver.disconnect();
		this.clearDragListeners?.();
	}

	private initDragListeners() {
		const dragElements = [this.closeButton, this.sidebarContainer, this.sidebarContent];
		// Forward longer touch events from the menu background to the
		// editor (and close the sidebar).
		this.manageListener(
			this.editor.handlePointerEventsExceptClicksFrom(
				this.menuContainer,
				(eventName, event) => {
					if (event.target === this.menuContainer) {
						if (eventName === 'pointerdown') {
							this.sidebarVisible.set(false);

							// A delay seems necessary for the editor
							setTimeout(() => this.editor.focus(), 0);
						}

						return true;
					}

					if (!this.sidebarVisible.get()) {
						return true;
					}

					// Don't send pointer events that don't directly target mainContainer
					// to the editor
					return false;
				},
				(_eventName, event) => {
					return event.target === this.menuContainer;
				},
			),
		);

		// Set lastGestureWasRoughlyClick to `true` initially because on page load
		// performance.now() is zero.
		let lastGestureWasRoughlyClick = true;
		let gestureEndTimestamp = 0;

		const dragController = makeDraggable(this.sidebarContainer, {
			draggableChildElements: dragElements,
			onDrag: (deltaX, deltaY) => this.handleDrag(deltaX, deltaY),
			onDragEnd: (dragStatistics) => {
				gestureEndTimestamp = dragStatistics.endTimestamp;
				lastGestureWasRoughlyClick = dragStatistics.roughlyClick;
				this.finalizeDrag();
			},
		});
		this.clearDragListeners = () => dragController.removeListeners();

		this.closeButton.onclick = () => {
			const wasJustDragging = performance.now() - gestureEndTimestamp < 100;

			// Ignore the click event if it was caused by dragging the button.
			if ((wasJustDragging && lastGestureWasRoughlyClick) || !wasJustDragging) {
				this.sidebarVisible.set(false);
			}
		};
	}

	/**
	 * Updates the position of this menu **during** a drag. After a drag ends,
	 * {@link finalizeDrag} should be called.
	 */
	private handleDrag(_deltaX: number, deltaY: number) {
		this.sidebarContainer.style.transition = 'none';
		this.sidebarY.set(this.sidebarY.get() + deltaY);
	}

	/** Returns `this.sidebarY` rounded to a valid value. */
	private snappedSidebarY(sidebarY?: number) {
		const y = sidebarY ?? this.sidebarY.get();

		const snapYs = [-100, 0];

		// Allow some amount of scrolling if the sidebar is too tall to fit entirely
		// in the window.
		if (this.sidebarContainer.clientHeight > window.innerHeight) {
			snapYs.push(100);
		}

		let closestSnap = snapYs[0];
		for (const snapY of snapYs) {
			if (Math.abs(snapY - y) < Math.abs(closestSnap - y)) {
				closestSnap = snapY;
			}
		}

		return closestSnap;
	}

	/**
	 * Moves the menu to a valid location or closes it, depending on
	 * the position set by the drag.
	 */
	private finalizeDrag() {
		this.sidebarContainer.style.transition = '';
		if (this.sidebarY.get() > this.sidebarContainer.clientHeight / 2) {
			this.sidebarVisible.set(false);
		} else {
			// Snap to the closest valid Y.
			this.sidebarY.set(this.snappedSidebarY());
		}
	}

	protected override serializeInternal() {
		return {
			menuSizeY: this.snappedSidebarY(),
		};
	}

	protected override deserializeInternal(json: any) {
		if (typeof json === 'object' && typeof json['menuSizeY'] === 'number') {
			// Load the y-position of the sidebar  -- call snappedSidebarY to ensure validity.
			this.sidebarY.set(this.snappedSidebarY(json['menuSizeY']));
		}
	}
}
