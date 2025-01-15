import addLongPressOrHoverCssClasses from '../../../util/addLongPressOrHoverCssClasses';
import { ReactiveValue } from '../../../util/ReactiveValue';
import { IconElemType } from '../../IconProvider';

interface Button {
	icon: () => IconElemType;
	label: string;
	onClick: () => void;
	onCreated?: (button: HTMLElement) => void;
	enabled?: ReactiveValue<boolean>;
}

/**
 * Adds the `buttons` to a container in a grid.
 */
const makeButtonGrid = (buttonSpecs: Button[], columnCount: number) => {
	const container = document.createElement('div');
	container.classList.add('toolbar-button-grid');

	container.style.setProperty('--column-count', `${columnCount}`);

	const makeButton = (buttonSpec: Button) => {
		const buttonElement = document.createElement('button');

		const iconElement = buttonSpec.icon();
		iconElement.classList.add('icon');

		const labelElement = document.createElement('label');
		labelElement.textContent = buttonSpec.label;
		labelElement.classList.add('button-label-text');

		buttonElement.onclick = buttonSpec.onClick;

		if (buttonSpec.enabled) {
			buttonSpec.enabled.onUpdateAndNow((enabled) => {
				buttonElement.disabled = !enabled;
			});
		}

		buttonElement.replaceChildren(iconElement, labelElement);
		container.appendChild(buttonElement);

		addLongPressOrHoverCssClasses(buttonElement);
		buttonSpec.onCreated?.(buttonElement);
		return buttonElement;
	};
	buttonSpecs.map(makeButton);

	return {
		container,
	};
};

export default makeButtonGrid;
