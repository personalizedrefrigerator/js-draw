import { makeLocalStorageIcon } from '../icons';
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
			getIcon: () => makeLocalStorageIcon(),
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

	public async getEntries(): Promise<StoreEntry[]> {
		// If the single supported entry hasn't been written to localStorage, show
		// nothing.
		if (!(saveLocalStorageKey in localStorage)) {
			return [];
		}

		// Local storage only supports a single entry.
		return [this.entry];
	}

	public async createNewEntry(): Promise<StoreEntry | null> {
		// Don't create a new entry if one already exists.
		if (saveLocalStorageKey in localStorage) {
			return null;
		}

		return this.entry;
	}
}
