import { IconProvider } from "../../src/lib";
import AbstractStore, { StoreEntry } from "./storage/AbstractStore";

/**
 * Creates the screen displayed on first launch of the application,
 * requesting the user to open a previously-saved drawing or make a
 * new drawing.
 */
const makeLoadFromSaveList = async (
	dataStore: AbstractStore, onEntryClicked: (entry: StoreEntry)=> void
) => {
	const container = document.createElement('div');

	for (const entry of await dataStore.getEntries()) {
		const button = createLaunchButton(entry.title, entry.getIcon(), () => {
			onEntryClicked(entry);
		});

		container.appendChild(button);
	}

	return container;
};


type ActionSpec = {
	label: string;
	action: ()=>void;
};

const createLaunchButton = (
	label: string, icon: Element, action: ()=>void, additionalActions: ActionSpec[] = []
) => {
	const button = document.createElement('button');
	const labelElem = document.createElement('span');
	labelElem.innerText = label;

	icon = icon.cloneNode(true) as Element;
	icon.classList.add('icon');

	button.appendChild(icon);
	button.appendChild(labelElem);

	button.onclick = () => action();

	if (additionalActions.length > 0) {
		const moreButton = document.createElement('button');
		const icon = (new IconProvider()).makeOverflowIcon();
		moreButton.appendChild(icon);

		moreButton.classList.add('more');
		// TODO
		const overflowList = document.createElement('div');
		overflowList.innerHTML = 'test';

		moreButton.onclick = () => {
			overflowList.style.display = 'block';;
		};
	}

	return button;
};

export default makeLoadFromSaveList;