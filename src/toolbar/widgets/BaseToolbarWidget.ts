import Editor from '../../Editor';
import BaseTool from '../../tools/BaseTool';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { makeDropdownIcon } from '../icons';
import { ToolbarLocalization } from '../localization';

export default abstract class BaseToolbarWidget {
	protected readonly container: HTMLElement;
	private button: HTMLElement;
	private icon: Element|null;
	private dropdownContainer: HTMLElement;
	private dropdownIcon: Element;
	private label: HTMLLabelElement;
	private hasDropdown: boolean;

	public constructor(
		protected editor: Editor,
		protected targetTool: BaseTool,
		protected localizationTable: ToolbarLocalization,
	) {
		this.icon = null;
		this.container = document.createElement('div');
		this.container.classList.add(`${toolbarCSSPrefix}toolContainer`);
		this.dropdownContainer = document.createElement('div');
		this.dropdownContainer.classList.add(`${toolbarCSSPrefix}dropdown`);
		this.dropdownContainer.classList.add('hidden');
		this.hasDropdown = false;

		this.button = document.createElement('div');
		this.button.classList.add(`${toolbarCSSPrefix}button`);
		this.label = document.createElement('label');
		this.button.setAttribute('role', 'button');
		this.button.tabIndex = 0;

		editor.notifier.on(EditorEventType.ToolEnabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolEnabled) {
				throw new Error('Incorrect event type! (Expected ToolEnabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(true);
			}
		});

		editor.notifier.on(EditorEventType.ToolDisabled, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolDisabled) {
				throw new Error('Incorrect event type! (Expected ToolDisabled)');
			}

			if (toolEvt.tool === targetTool) {
				this.updateSelected(false);
				this.setDropdownVisible(false);
			}
		});
	}

	protected abstract getTitle(): string;
	protected abstract createIcon(): Element;

	// Add content to the widget's associated dropdown menu.
	// Returns true if such a menu should be created, false otherwise.
	protected abstract fillDropdown(dropdown: HTMLElement): boolean;

	protected setupActionBtnClickListener(button: HTMLElement) {
		button.onclick = () => {
			this.handleClick();
		};
	}

	protected handleClick() {
		if (this.hasDropdown) {
			if (!this.targetTool.isEnabled()) {
				this.targetTool.setEnabled(true);
			} else {
				this.setDropdownVisible(!this.isDropdownVisible());
			}
		} else {
			this.targetTool.setEnabled(!this.targetTool.isEnabled());
		}
	}

	// Adds this to [parent]. This can only be called once for each ToolbarWidget.
	public addTo(parent: HTMLElement) {
		this.label.innerText = this.getTitle();

		this.setupActionBtnClickListener(this.button);

		this.icon = null;
		this.updateIcon();

		this.updateSelected(this.targetTool.isEnabled());

		this.button.replaceChildren(this.icon!, this.label);
		this.container.appendChild(this.button);

		this.hasDropdown = this.fillDropdown(this.dropdownContainer);
		if (this.hasDropdown) {
			this.dropdownIcon = this.createDropdownIcon();
			this.button.appendChild(this.dropdownIcon);
			this.container.appendChild(this.dropdownContainer);
		}

		this.setDropdownVisible(false);
		parent.appendChild(this.container);
	}

	protected updateIcon() {
		const newIcon = this.createIcon();
		this.icon?.replaceWith(newIcon);
		this.icon = newIcon;
		this.icon.classList.add(`${toolbarCSSPrefix}icon`);
	}

	protected updateSelected(selected: boolean) {
		const currentlySelected = this.container.classList.contains('selected');
		if (currentlySelected === selected) {
			return;
		}

		if (selected) {
			this.container.classList.add('selected');
			this.button.ariaSelected = 'true';
		} else {
			this.container.classList.remove('selected');
			this.button.ariaSelected = 'false';
		}
	}

	protected setDropdownVisible(visible: boolean) {
		const currentlyVisible = this.container.classList.contains('dropdownVisible');
		if (currentlyVisible === visible) {
			return;
		}

		if (visible) {
			this.dropdownContainer.classList.remove('hidden');
			this.container.classList.add('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownShown(this.targetTool.description)
			);
		} else {
			this.dropdownContainer.classList.add('hidden');
			this.container.classList.remove('dropdownVisible');
			this.editor.announceForAccessibility(
				this.localizationTable.dropdownHidden(this.targetTool.description)
			);
		}

		this.repositionDropdown();
	}

	protected repositionDropdown() {
		const dropdownBBox = this.dropdownContainer.getBoundingClientRect();
		const screenWidth = document.body.clientWidth;

		if (dropdownBBox.left > screenWidth / 2) {
			this.dropdownContainer.style.marginLeft = this.button.clientWidth + 'px';
			this.dropdownContainer.style.transform = 'translate(-100%, 0)';
		} else {
			this.dropdownContainer.style.marginLeft = '';
			this.dropdownContainer.style.transform = '';
		}
	}

	protected isDropdownVisible(): boolean {
		return !this.dropdownContainer.classList.contains('hidden');
	}

	private createDropdownIcon(): Element {
		const icon = makeDropdownIcon();
		icon.classList.add(`${toolbarCSSPrefix}showHideDropdownIcon`);
		return icon;
	}
}
