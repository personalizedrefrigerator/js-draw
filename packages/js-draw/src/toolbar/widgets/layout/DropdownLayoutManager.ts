import { EditorEventType, EditorNotifier } from '../../../types';
import EventDispatcher, { DispatcherEventListener } from '../../../EventDispatcher';
import { ToolbarLocalization } from '../../localization';
import { ToolMenu, WidgetContentLayoutManager, ToolMenuParent } from './types';
import { toolbarCSSPrefix } from '../../constants';
import { MutableReactiveValue, ReactiveValue } from '../../../util/ReactiveValue';

enum DropdownEventType {
	DropdownShown,
	DropdownHidden,
}

interface DropdownShownEvent {
	// If undefined, the event is forwarded from a different layout manager
	dropdown?: Dropdown;

	fromToplevelDropdown: boolean;
}

type NotifierType = EventDispatcher<DropdownEventType, DropdownShownEvent>;

class Dropdown implements ToolMenu {
	private dropdownContainer: HTMLElement;
	public readonly visible: MutableReactiveValue<boolean>;

	private dropdownToggleListener: DispatcherEventListener | null = null;

	public constructor(
		public parent: ToolMenuParent,
		private notifier: NotifierType,
		private onDestroy: () => void,
	) {
		this.visible = ReactiveValue.fromInitialValue(false);

		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');

		parent.target.insertAdjacentElement('afterend', this.dropdownContainer);

		// When another dropdown is shown,
		this.dropdownToggleListener = this.notifier.on(DropdownEventType.DropdownShown, (evt) => {
			if (
				evt.dropdown !== this &&
				// Don't hide if a submenu was shown (it might be a submenu of
				// the current menu).
				evt.fromToplevelDropdown
			) {
				this.setVisible(false);
			}
		});
	}

	public onActivated(): void {
		// Do nothing.
	}

	protected repositionDropdown() {
		const dropdownBBox = this.dropdownContainer.getBoundingClientRect();
		const screenWidth = document.scrollingElement?.clientWidth ?? document.body.clientHeight;
		const screenHeight = document.scrollingElement?.clientHeight ?? document.body.clientHeight;

		let translateX = undefined;
		let translateY = undefined;

		if (dropdownBBox.left > screenWidth / 2) {
			const targetElem = this.parent.target;
			translateX = `calc(${targetElem.clientWidth + 'px'} - 100%)`;
		}

		// Shift the dropdown if it's off the screen, but only if doing so moves it on to the screen
		// (prevents dropdowns from going almost completely offscreen on small screens).
		if (dropdownBBox.bottom > screenHeight && dropdownBBox.top - dropdownBBox.height > 0) {
			const targetElem = this.parent.target;
			translateY = `calc(-${targetElem.clientHeight}px - 100%)`;
		}

		// Use .translate so as not to conflict with CSS animating the
		// transform property.
		if (translateX || translateY) {
			this.dropdownContainer.style.translate = `${translateX ?? '0'} ${translateY ?? '0'}`;
		} else {
			this.dropdownContainer.style.translate = '';
		}
	}

	private hideDropdownTimeout: ReturnType<typeof setTimeout> | null = null;
	private setVisible(visible: boolean) {
		const currentlyVisible = this.visible.get();
		if (currentlyVisible === visible) {
			return;
		}

		// If waiting to hide the dropdown, cancel it.
		if (this.hideDropdownTimeout) {
			clearTimeout(this.hideDropdownTimeout);
			this.hideDropdownTimeout = null;
			this.dropdownContainer.classList.remove('hiding');
			this.repositionDropdown();
		}

		const animationDuration = 150; // ms

		this.visible.set(visible);
		if (visible) {
			this.dropdownContainer.classList.remove('hidden');

			this.notifier.dispatch(DropdownEventType.DropdownShown, {
				dropdown: this,
				fromToplevelDropdown: this.parent.isToplevel(),
			});

			this.repositionDropdown();
		} else {
			this.notifier.dispatch(DropdownEventType.DropdownHidden, {
				dropdown: this,
				fromToplevelDropdown: this.parent.isToplevel(),
			});

			this.dropdownContainer.classList.add('hiding');

			// Hide the dropdown *slightly* before the animation finishes. This
			// prevents flickering in some browsers.
			const hideDelay = animationDuration * 0.95;

			this.hideDropdownTimeout = setTimeout(() => {
				this.dropdownContainer.classList.add('hidden');
				this.dropdownContainer.classList.remove('hiding');
				this.repositionDropdown();
			}, hideDelay);
		}

		// Animate
		const animationName = `var(--dropdown-${visible ? 'show' : 'hide'}-animation)`;
		this.dropdownContainer.style.animation = `${animationDuration}ms ease ${animationName}`;
	}

	public requestShow(): void {
		this.setVisible(true);
	}

	public requestHide(): void {
		this.setVisible(false);
	}

	public appendChild(item: HTMLElement): void {
		this.dropdownContainer.appendChild(item);
	}

	public clearChildren(): void {
		this.dropdownContainer.replaceChildren();
	}

	public destroy(): void {
		this.setVisible(false);
		this.dropdownContainer.remove();
		this.dropdownToggleListener?.remove();

		// Allow children to be added to other parents
		this.clearChildren();
		this.onDestroy();
	}
}

export default class DropdownLayoutManager implements WidgetContentLayoutManager {
	private notifier: NotifierType;
	private dropdowns: Set<Dropdown> = new Set();

	public constructor(
		announceForAccessibility: (text: string) => void,
		private localization: ToolbarLocalization,
	) {
		this.notifier = new EventDispatcher();
		this.notifier.on(DropdownEventType.DropdownShown, ({ dropdown, fromToplevelDropdown }) => {
			if (!dropdown) return;

			announceForAccessibility(this.localization.dropdownShown(dropdown.parent.getTitle()));

			// Share the event with other connected notifiers
			this.connectedNotifiers.forEach((notifier) => {
				notifier.dispatch(EditorEventType.ToolbarDropdownShown, {
					kind: EditorEventType.ToolbarDropdownShown,
					fromToplevelDropdown,
					layoutManager: this,
				});
			});
		});

		this.notifier.on(DropdownEventType.DropdownHidden, ({ dropdown }) => {
			if (!dropdown) return;

			announceForAccessibility(this.localization.dropdownHidden(dropdown.parent.getTitle()));
		});
	}

	private listeners: DispatcherEventListener[] = [];
	private connectedNotifiers: EditorNotifier[] = [];
	public connectToEditorNotifier(notifier: EditorNotifier) {
		this.connectedNotifiers.push(notifier);
		this.refreshListeners();
	}

	/** Creates a dropdown within `parent`. */
	public createToolMenu(parent: ToolMenuParent): ToolMenu {
		const dropdown = new Dropdown(parent, this.notifier, () => {
			this.dropdowns.delete(dropdown);

			this.refreshListeners();
		});
		this.dropdowns.add(dropdown);
		this.refreshListeners();

		return dropdown;
	}

	/**
	 * Adds/removes listeners based on whether we have any managed dropdowns.
	 *
	 * We attempt to clean up all resources when `dropdowns.size == 0`, at which
	 * point, an instance of this could be safely garbage collected.
	 */
	private refreshListeners() {
		const clearListeners = () => {
			// Remove all listeners & resources that won't be garbage collected.
			this.listeners.forEach((l) => l.remove());
			this.listeners = [];
		};

		if (this.dropdowns.size === 0) {
			clearListeners();
		} else if (this.listeners.length !== this.connectedNotifiers.length) {
			clearListeners();

			this.listeners = this.connectedNotifiers.map((notifier) => {
				return notifier.on(EditorEventType.ToolbarDropdownShown, (evt) => {
					if (
						evt.kind !== EditorEventType.ToolbarDropdownShown ||
						// Don't forward to ourselves events that we originally triggered.
						evt.layoutManager === this
					) {
						return;
					}

					this.notifier.dispatch(DropdownEventType.DropdownShown, {
						fromToplevelDropdown: evt.fromToplevelDropdown,
					});
				});
			});
		}
	}
}
