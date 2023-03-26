import { Localization } from '../localization';
import AbstractStore, { StoreEntry } from './AbstractStore';

// Key used for reading/writing images to localStorage.
const saveLocalStorageKey = 'lastSave';

export class LocalStorageStore implements AbstractStore {
	// LocalStorageStore only supports a single entry.
	private entry: StoreEntry;

	public constructor(localization: Localization) {
		this.entry = {
			title: localization.localStorageSave,
			getIcon: () => this.createLocalStorageIcon(),
			delete: async () => {
				localStorage.removeItem(saveLocalStorageKey);
			},
			write: async (value: string) => {
				localStorage.setItem(saveLocalStorageKey, value);
			},
			read: async () => {
				return localStorage.getItem(saveLocalStorageKey) ?? '';
			},

			// Not supported.
			updatePreview: null,
			updateTitle: null,
		};
	}

	private createLocalStorageIcon() {
		const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		elem.innerHTML = `
            <path d="M 50,10 V 60 H 35 L 55,85 75,60 H 60 V 10 Z" fill="black"/>
            <path d="m 15,85 v 10 h 85 V 85 Z" fill="black"/>
        `;
		elem.setAttribute('viewBox', '5 0 100 100');
		return elem;
	}

	public async getEntries(): Promise<StoreEntry[]> {
		// If the single supported entry hasn't been written to localStorage, show
		// nothing.
		if (!(saveLocalStorageKey in localStorage)) {
			return [];
		}

		// Local storage only supports a single entry.
		return [ this.entry ];
	}

	public async createNewEntry(): Promise<StoreEntry | null> {
		// Don't create a new entry if one already exists.
		if (saveLocalStorageKey in localStorage) {
			return null;
		}

		return this.entry;
	}
}