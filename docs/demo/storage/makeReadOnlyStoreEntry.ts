import { makeIconFromText } from '../icons';
import { StoreEntry } from './AbstractStore';

/** Returns a `StoreEntry` that returns the given content, but cannot be updated/saved. */
const makeReadOnlyStoreEntry = (content: string, onIllegalOperation?: ()=>void): StoreEntry => {
	return {
		title: 'Read-only store entry',
		getIcon() {
			return makeIconFromText('!');
		},
		delete: async () => {
			console.warn('Attempt to delete a dummyStoreEntry');
			onIllegalOperation?.();
		},
		read: async () => content,
		write: async () => {
			console.warn('Attempt to write to a dummyStoreEntry');
			onIllegalOperation?.();
		},
		updatePreview: null,
		updateTitle: null,
	};
};
export default makeReadOnlyStoreEntry;