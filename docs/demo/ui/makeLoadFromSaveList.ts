import { IconProvider } from 'js-draw';
import { Localization } from '../localization';
import AbstractStore, { StoreEntry } from '../storage/AbstractStore';
import './loadFromSaveList.css';

/**
 * Creates the screen displayed on first launch of the application,
 * requesting the user to open a previously-saved drawing or make a
 * new drawing.
 */
const makeLoadFromSaveList = async (
	dataStore: AbstractStore, onEntryClicked: (entry: StoreEntry)=> void, localization: Localization
) => {
	const container = document.createElement('div');
	container.classList.add('save-item-list');
	const icons = new IconProvider();

	for (const entry of await dataStore.getEntries()) {
		const button = createLaunchButton(entry.title, entry.getIcon(), () => {
			onEntryClicked(entry);
		}, [{
			label: localization.delete,
			icon: icons.makeDeleteSelectionIcon(),
			action: async (entryContainer) => {
				if (confirm(localization.reallyDelete(entry.title))) {
					await entry.delete();
					entryContainer.remove();
				}
			},
		}]);

		container.appendChild(button);
	}

	return container;
};


type ActionSpec = {
	label: string;
	icon: Element;
	action: (buttonContainer: HTMLElement)=>void;
};

const createLaunchButton = (
	label: string, icon: Element, action: ()=>void, additionalActions: ActionSpec[] = []
) => {
	const container = document.createElement('div');
	container.classList.add('save-item');

	const launchButton = document.createElement('button');
	launchButton.classList.add('open-button');

	const labelElem = document.createElement('span');
	labelElem.innerText = label;

	icon = icon.cloneNode(true) as Element;
	icon.classList.add('icon');

	launchButton.appendChild(icon);
	launchButton.appendChild(labelElem);

	launchButton.onclick = () => action();
	container.appendChild(launchButton);

	for (const action of additionalActions) {
		const actionButton = document.createElement('button');
		const actionButtonLabel = document.createElement('div');
		actionButtonLabel.innerText = action.label;

		actionButton.appendChild(action.icon.cloneNode(true));
		actionButton.appendChild(actionButtonLabel);
		actionButton.onclick = () => action.action(container);

		container.appendChild(actionButton);
	}

	return container;
};

export default makeLoadFromSaveList;