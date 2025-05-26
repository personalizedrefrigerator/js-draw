import addLongPressOrHoverCssClasses from '../../../util/dom/addLongPressOrHoverCssClasses';
import createButton from '../../../util/dom/createButton';
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
 * Creates HTML `button` elements from `buttonSpecs` and displays them in a
 * grid with `columnCount` columns.
 */
const makeButtonGrid = (buttonSpecs: Button[], columnCount: number) => {
	const container = document.createElement('div');
	container.classList.add('toolbar-button-grid');

	container.style.setProperty('--column-count', `${columnCount}`);

	const makeButton = (buttonSpec: Button) => {
		const buttonElement = createButton();
		buttonElement.classList.add('button');

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
