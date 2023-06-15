import { IconType } from '../types';
import './FloatingActionButton.css';

type OnClickListener = ()=>void;

interface ButtonSpecifier {
	title: string;
	icon: IconType;
	onClick?: OnClickListener;
}

const toplevelClassName = 'toplevel';

export default class FloatingActionButton {
	private container: HTMLElement;
	private mainButton: HTMLButtonElement;
	private iconWrapper: HTMLDivElement;
	private titleElem: HTMLDivElement;
	private disabled: boolean;

	private onClickListeners: Set<OnClickListener> = new Set();

	public constructor(
		{ title, icon, onClick }: ButtonSpecifier,
		parent: HTMLElement
	) {
		this.container = document.createElement('div');

		this.mainButton = document.createElement('button');
		this.iconWrapper = document.createElement('div');
		this.titleElem = document.createElement('div');

		this.container.classList.add('floating-action-button');
		this.container.classList.add(toplevelClassName);
		this.iconWrapper.classList.add('icon-wrapper');
		this.titleElem.classList.add('title');

		this.iconWrapper.appendChild(icon.cloneNode(true));
		this.titleElem.innerText = title;

		this.mainButton.replaceChildren(
			this.iconWrapper,
			this.titleElem,
		);
		this.mainButton.onclick = () => this.onClick();

		if (onClick) {
			this.onClickListeners.add(onClick);
		}

		this.container.replaceChildren(this.mainButton);
		parent.appendChild(this.container);
	}

	/** Callback triggered when this button is clicked. */
	private onClick() {
		if (this.disabled) {
			return;
		}

		// Trigger all listeners
		for (const listener of this.onClickListeners) {
			listener();
		}
	}

	public setDisabled(disabled: boolean) {
		this.disabled = disabled;
		this.mainButton.disabled = this.disabled;
	}

	public addClickListener(listener: OnClickListener) {
		this.onClickListeners.add(listener);

		return {
			remove: () => {
				this.onClickListeners.delete(listener);
			},
		};
	}
}
