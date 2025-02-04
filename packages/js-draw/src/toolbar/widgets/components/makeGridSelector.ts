import { MutableReactiveValue } from '../../../util/ReactiveValue';
import stopPropagationOfScrollingWheelEvents from '../../../util/stopPropagationOfScrollingWheelEvents';
import addLongPressOrHoverCssClasses from '../../../util/addLongPressOrHoverCssClasses';
import { IconElemType } from '../../IconProvider';
import { toolbarCSSPrefix } from '../../constants';

interface GridSelectChoice<ChoiceIdType> {
	// `id` should be unique in all choices
	id: ChoiceIdType;
	makeIcon: () => IconElemType;
	title: string;
}

interface GridSelector<ChoiceIdType> {
	value: MutableReactiveValue<ChoiceIdType>;

	/**
	 * Connects this grid selector with `other` such that only one item in
	 * either this or `other` can be selected at a time.
	 */
	linkWith: (other: GridSelector<ChoiceIdType>) => void;

	/** Re-builds the icons shown in the grid selector. */
	updateIcons: () => void;

	getRootElement: () => HTMLElement;
	addTo: (parent: HTMLElement) => void;

	/** Used internally @internal */
	_radiogroupName: string;
}

let idCounter = 0;

/**
 * Creates a widget that allows users to select one of serveral items from a list.
 *
 * `ChoiceIdType` should be `string`, a `number`, or an `enum` (or similar).
 *
 * If this input is set to an ID that is not in `choices`, no item is selected.
 */
const makeGridSelector = <ChoiceIdType>(
	// Text before the grid selector used as a label
	labelText: string,
	defaultId: ChoiceIdType,
	choices: GridSelectChoice<ChoiceIdType>[],
): GridSelector<ChoiceIdType> => {
	const outerContainer = document.createElement('div');
	outerContainer.classList.add(`${toolbarCSSPrefix}grid-selector`);

	const selectedValue = MutableReactiveValue.fromInitialValue(defaultId);

	const menuContainer = document.createElement('div');
	menuContainer.role = 'group';
	menuContainer.id = `${toolbarCSSPrefix}-grid-select-id-${idCounter++}`;

	stopPropagationOfScrollingWheelEvents(menuContainer);

	const label = document.createElement('label');
	label.textContent = labelText;
	label.htmlFor = menuContainer.id;
	outerContainer.appendChild(label);

	// All buttons in a radiogroup need the same name attribute.
	let radiogroupName = `${toolbarCSSPrefix}-grid-selector-${idCounter++}`;

	type ChoiceType = GridSelectChoice<ChoiceIdType>;

	const createChoiceButton = (record: ChoiceType) => {
		const buttonContainer = document.createElement('div');
		buttonContainer.classList.add('choice-button');

		const button = document.createElement('input');
		button.type = 'radio';
		button.id = `${toolbarCSSPrefix}-grid-select-button-${idCounter++}`;

		// Some toolbars only show the label on hover. Having long press or hover
		// CSS classes are helpful here.
		addLongPressOrHoverCssClasses(buttonContainer);

		// Clicking any part of labelContainer triggers the radio button.
		const labelContainer = document.createElement('label');

		const rebuildLabel = () => {
			labelContainer.setAttribute('title', record.title);

			const labelText = document.createElement('span');
			labelText.classList.add('button-label-text');

			const icon = record.makeIcon();
			icon.classList.add('icon');

			// The title of the record
			labelText.innerText = record.title;
			labelContainer.htmlFor = button.id;

			labelContainer.replaceChildren(icon, labelText);
		};
		rebuildLabel();

		// Mark the button as belonging to the current group (causes
		// other buttons in the same group to automatically uncheck
		// when this button is checked).
		const updateButtonRadiogroupName = () => {
			button.name = radiogroupName;
		};

		updateButtonRadiogroupName();

		const updateButtonCSS = () => {
			if (button.checked) {
				buttonContainer.classList.add('checked');
			} else {
				buttonContainer.classList.remove('checked');
			}
		};

		button.oninput = () => {
			// Setting the selected value fires an event that causes the value
			// of this button to be set.
			if (button.checked) {
				selectedValue.set(record.id);
			}

			updateButtonCSS();
		};

		button.onfocus = () => {
			if (buttonContainer.querySelector(':focus-visible')) {
				buttonContainer.classList.add('focus-visible');
			}
		};

		button.onblur = () => {
			buttonContainer.classList.remove('focus-visible');
		};

		// Prevent the right-click menu from being shown on long-press
		// (important for some toolbars that use long-press gestures to
		// show grid selector labels).
		buttonContainer.oncontextmenu = (event) => {
			event.preventDefault();
		};

		buttonContainer.replaceChildren(button, labelContainer);
		menuContainer.appendChild(buttonContainer);

		// Set whether the current button is checked
		const setChecked = (checked: boolean) => {
			button.checked = checked;
			updateButtonCSS();
		};
		setChecked(false);

		// Updates the factory's icon based on the current style of the tool.
		const updateIcon = () => {
			rebuildLabel();
		};

		return {
			choiceRecord: record,
			setChecked,
			updateIcon,
			updateButtonRadiogroupName,
		};
	};

	const buttons: Array<ReturnType<typeof createChoiceButton>> = [];
	for (const choice of choices) {
		buttons.push(createChoiceButton(choice));
	}
	// invariant: buttons.length = choices.length
	// However, it is still possible that selectedValue does not correspond
	// to a choice in `choices`. This is acceptable.

	outerContainer.appendChild(menuContainer);

	selectedValue.onUpdateAndNow((choiceId) => {
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].setChecked(buttons[i].choiceRecord.id === choiceId);
		}
	});

	const result = {
		value: selectedValue,

		_radiogroupName: radiogroupName,

		linkWith: (other: GridSelector<ChoiceIdType>) => {
			result._radiogroupName = other._radiogroupName;
			radiogroupName = other._radiogroupName;

			for (const button of buttons) {
				button.updateButtonRadiogroupName();
			}
		},

		updateIcons: () => {
			buttons.forEach((button) => button.updateIcon());
		},

		getRootElement() {
			return outerContainer;
		},

		addTo: (parent: HTMLElement) => {
			parent.appendChild(outerContainer);
		},
	};

	return result;
};

export default makeGridSelector;
