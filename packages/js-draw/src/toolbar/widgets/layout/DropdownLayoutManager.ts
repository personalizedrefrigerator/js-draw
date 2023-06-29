import { EditorEventType, EditorNotifier } from '../../../types';
import EventDispatcher, { DispatcherEventListener } from '../../../EventDispatcher';
import { ToolbarLocalization } from '../../localization';
import { WidgetContentDisplay, WidgetContentLayoutManager, WidgetContentParent } from './types';
import { toolbarCSSPrefix } from '../../constants';

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

class Dropdown implements WidgetContentDisplay {
	private dropdownContainer: HTMLElement;

	private dropdownToggleListener: DispatcherEventListener|null = null;

	public constructor(
		public parent: WidgetContentParent,
		private notifier: NotifierType,
		private onDestroy: ()=>void,
	) {
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

	public noteActivated(): void {
		// Do nothing.
	}

	protected repositionDropdown() {
		const dropdownBBox = this.dropdownContainer.getBoundingClientRect();
		const screenWidth = document.body.clientWidth;

		if (dropdownBBox.left > screenWidth / 2) {
			// Use .translate so as not to conflict with CSS animating the
			// transform property.
			const targetElem = this.parent.target;
			this.dropdownContainer.style.translate = `calc(${targetElem.clientWidth + 'px'} - 100%) 0`;
		} else {
			this.dropdownContainer.style.translate = '';
		}
	}

	private hideDropdownTimeout: any|null = null;
	private setVisible(visible: boolean) {
		// TODO(!): Avoid modifying parent.classList
		const parentElem = this.parent.target.parentElement!;
		const currentlyVisible = this.isVisible();
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

		if (visible) {
			this.dropdownContainer.classList.remove('hidden');
			parentElem.classList.add('dropdownVisible');

			this.notifier.dispatch(DropdownEventType.DropdownShown, {
				dropdown: this,
				fromToplevelDropdown: this.parent.isToplevel(),
			});

			this.repositionDropdown();
		} else {
			parentElem.classList.remove('dropdownVisible');

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
		const animationName = `var(--dropdown-${
			visible ? 'show' : 'hide'
		}-animation)`;
		this.dropdownContainer.style.animation = `${animationDuration}ms ease ${animationName}`;
	}

	public requestShow(): void {
		this.setVisible(true);
	}

	public requestHide(): void {
		this.setVisible(false);
	}

	public isVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}

	public addItem(item: HTMLElement): void {
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
		announceForAccessibility: (text: string)=>void,
		private localization: ToolbarLocalization,
	) {
		this.notifier = new EventDispatcher();
		this.notifier.on(DropdownEventType.DropdownShown, ({ dropdown, fromToplevelDropdown }) => {
			if (!dropdown) return;

			announceForAccessibility(
				this.localization.dropdownShown(dropdown.parent.getTitle())
			);

			// Share the event with other connected notifiers
			this.connectedNotifiers.forEach(notifier => {
				notifier.dispatch(EditorEventType.ToolbarDropdownShown, {
					kind: EditorEventType.ToolbarDropdownShown,
					fromToplevelDropdown,
					layoutManager: this,
				});
			});
		});

		this.notifier.on(DropdownEventType.DropdownHidden, ({ dropdown }) => {
			if (!dropdown) return;

			announceForAccessibility(
				this.localization.dropdownHidden(dropdown.parent.getTitle())
			);
		});
	}

	private listeners: DispatcherEventListener[] = [];
	private connectedNotifiers: EditorNotifier[] = [];
	public connectToEditorNotifier(notifier: EditorNotifier) {
		this.connectedNotifiers.push(notifier);
		this.refreshListeners();
	}

	/** Creates a dropdown within `parent`. */
	public createContentDisplay(parent: WidgetContentParent): WidgetContentDisplay {
		const dropdown = new Dropdown(
			parent,
			this.notifier,
			() => {
				this.dropdowns.delete(dropdown);

				this.refreshListeners();
			}
		);
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
			this.listeners.forEach(l => l.remove());
			this.listeners = [];
		};

		if (this.dropdowns.size === 0) {
			clearListeners();
		} else if (this.listeners.length !== this.connectedNotifiers.length) {
			clearListeners();

			this.listeners = this.connectedNotifiers.map(notifier => {
				return notifier.on(EditorEventType.ToolbarDropdownShown, (evt) => {
					if (evt.kind !== EditorEventType.ToolbarDropdownShown

						// Don't forward to ourselves events that we originally triggered.
						|| evt.layoutManager === this) {
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