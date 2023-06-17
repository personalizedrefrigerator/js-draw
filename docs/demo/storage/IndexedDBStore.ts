import { Localization } from '../localization';
import AbstractStore, { StoreEntry } from './AbstractStore';
import { makeIconFromText } from '../icons';

const imageDataStoreName = 'imageData';
const imageMetadataStoreName = 'imageMetadata';

interface ImageMetadataRecord {
	id: number;
	name: string;
	lastUpdateTime: number;
	previewData?: string;
	previewType?: 'datauri';
}

/**
 * Ensures that all fields in the given `record` have the correct type. Does not check
 * for extra fields.
 *
 * Returns `null` on success. Else, returns an error message.
 */
const validateImageMetadataRecord = (record: ImageMetadataRecord): string|null => {
	if (!record) {
		return 'Not given a record!';
	}

	if (typeof (record.id) !== 'number') {
		return 'Given record has non-number ID';
	}

	if (typeof (record.name) !== 'string') {
		return 'Given record has non-string name';
	}

	if (typeof (record.previewData) !== 'string' && record.previewData) {
		return 'Given record has non-string (and non-undefined) previewData';
	}

	return null;
};

export class IndexedDBStore implements AbstractStore {
	private constructor(
		private db: IDBDatabase,
		private localization: Localization) {

	}

	/** Constructs a new IndexedDBStore. */
	public static create(localization: Localization): Promise<IndexedDBStore> {
		return new Promise<IndexedDBStore>((resolve, reject) => {
			console.log('creating...');
			const dbFactory = indexedDB.open('js-draw-saves', 1);

			dbFactory.onsuccess = () => {
				const db = dbFactory.result;

				console.log('indexedDB: ☑');
				resolve(new IndexedDBStore(db, localization));
			};

			dbFactory.onerror = () => {
				console.log('reject: ' + dbFactory.error);

				// TODO: Use dbFactory.errorCode to provide a better error message.
				reject(localization.databaseLoadError);
			};

			dbFactory.onupgradeneeded = (event: any) => {
				console.log('upgradeneeded');
				const db = event.target.result as IDBDatabase;

				const metadataStore = db.createObjectStore(imageMetadataStoreName, { keyPath: 'id', autoIncrement: true });
				metadataStore.createIndex('id', 'id', { unique: true });
				metadataStore.createIndex('name', 'name', { unique: false });

				const imageDataStore = db.createObjectStore(imageDataStoreName, { keyPath: 'id', autoIncrement: true });
				imageDataStore.createIndex('id', 'id', { unique: true });

				// TODO: Do we need imageStore.transaction.oncomplete before returning?
			};
		});
	}

	/** Deletes the image with the given ID. */
	private deleteEntry(id: number): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// Delete from both the metadata and image data
			const deleteDataRequest = this.db
				.transaction(['imageData'], 'readwrite')
				.objectStore('imageData')
				.delete(id);

			const deleteMetadataRequest = this.db
				.transaction(['imageMetadata'], 'readwrite')
				.objectStore('imageMetadata')
				.delete(id);

			deleteDataRequest.onerror = () => reject('Error deleting image data: ' + deleteDataRequest.error);
			deleteMetadataRequest.onerror = () => reject('Error deleting image metadata: ' + deleteMetadataRequest.error);

			let nextSuccessCallback = () => {
				nextSuccessCallback = resolve;
			};

			deleteDataRequest.onsuccess = () => nextSuccessCallback();
			deleteMetadataRequest.onsuccess = () => nextSuccessCallback();
		});
	}

	/** Reads image metadata from the database, for the image with the given ID. */
	private readImageMetadata(id: number): Promise<ImageMetadataRecord|null> {
		return new Promise<ImageMetadataRecord|null>((resolve, reject) => {
			const readRequest = this.db
				.transaction([imageMetadataStoreName], 'readonly')
				.objectStore(imageMetadataStoreName)
				.get(id);

			readRequest.onsuccess = (event: any) => {
				const data = event.target.result as ImageMetadataRecord|undefined;
				console.log(`read metadata for ${id} with result ${data}`);

				if (data) {
					const error = validateImageMetadataRecord(data);
					if (error) {
						reject('Reading image metadata: ' + error);
						return;
					}
				}

				resolve(data ?? null);
			};

			readRequest.onerror = () => reject('Error reading image: ' + readRequest.error);
		});
	}

	/**
	 * Updates the metadata for the image with ID matching `metadata`.
	 */
	private updateEntryMetadata(metadata: ImageMetadataRecord) {
		return new Promise<void>((resolve, reject) => {
			const writeDataRequest = this.db
				.transaction([imageMetadataStoreName], 'readwrite')
				.objectStore(imageMetadataStoreName)
				.put(metadata);

			writeDataRequest.onsuccess = () => resolve();
			writeDataRequest.onerror = () => reject('Error saving metadata: ' + writeDataRequest.error);
		});
	}

	private makeMetadata(id: number, title?: string, previewData?: string): ImageMetadataRecord {
		return {
			id,
			name: title ?? this.localization.untitledImage,
			lastUpdateTime: (new Date()).getTime(),
			previewData
		};
	}

	/**
	 * Updates the preview data for the image with the given `id`.
	 *
	 * `previewData` currently must be a data URL.
	 */
	private async updateEntryPreview(id: number, previewData: string) {
		const existingMetadata = await this.readImageMetadata(id) ?? this.makeMetadata(id);
		existingMetadata.previewData = previewData;
		existingMetadata.previewType = 'datauri';

		await this.updateEntryMetadata(existingMetadata);
	}

	/** Changes the title of the image with the given `id`. */
	private async updateEntryTitle(id: number, newTitle: string) {
		const metadata = await this.readImageMetadata(id) ?? this.makeMetadata(id);
		metadata.name = newTitle;
		await this.updateEntryMetadata(metadata);
	}

	private async updateStoreEntryModifyTime(id: number) {
		const metadata = await this.readImageMetadata(id) ?? this.makeMetadata(id);
		metadata.lastUpdateTime = (new Date()).getTime();
		await this.updateEntryMetadata(metadata);
	}

	/** Writes an SVG image to the entry with the given ID. */
	private async writeImage(id: number, svgData: string) {
		await (new Promise<void>((resolve, reject) => {
			const writeDataRequest = this.db
				.transaction([imageDataStoreName], 'readwrite')
				.objectStore(imageDataStoreName)
				.put({ id, data: svgData });

			writeDataRequest.onsuccess = () => resolve();
			writeDataRequest.onerror = () => reject('Error saving data: ' + writeDataRequest.error);
		}));

		await this.updateStoreEntryModifyTime(id);
	}

	/** Reads an SVG image saved with the given ID. */
	private readImage(id: number) {
		return new Promise<string>((resolve, reject) => {
			const readDataRequest = this.db
				.transaction([imageDataStoreName], 'readonly')
				.objectStore(imageDataStoreName)
				.get(id);

			readDataRequest.onsuccess = (event: any) => {
				const data = event.target.result.data as string;

				if (typeof (data) !== 'string') {
					reject('Reading image: Type of image data is not string');
					return;
				}

				resolve(data);
			};

			readDataRequest.onerror = () => reject('Error reading image: ' + readDataRequest.error);
		});
	}

	private createStoreEntry(metadata: ImageMetadataRecord): StoreEntry {
		return {
			title: metadata.name,

			getIcon: () => {
				if (metadata.previewData) {
					const icon = new Image();
					icon.src = metadata.previewData;
					return icon;
				} else {
					return makeIconFromText('?');
				}
			},

			updatePreview: async (previewData: string) => {
				await this.updateEntryPreview(metadata.id, previewData);
			},

			updateTitle: async (newTitle: string) => {
				await this.updateEntryTitle(metadata.id, newTitle);
			},

			delete: async () => {
				await this.deleteEntry(metadata.id);
			},

			write: async (svgData: string) => {
				await this.writeImage(metadata.id, svgData);
			},

			read: async () => {
				return await this.readImage(metadata.id);
			},
		};
	}

	public getEntries(): Promise<StoreEntry[]> {
		const imageMetadataStore = this.db
			.transaction(imageMetadataStoreName, 'readonly')
			.objectStore(imageMetadataStoreName);

		return new Promise<StoreEntry[]>((resolve, reject) => {
			const keyRequest = imageMetadataStore.getAll();
			keyRequest.onsuccess = (event: any) => {
				const imageMetadataList = event.target.result as ImageMetadataRecord[];

				// Sort in order of increasing update time.
				imageMetadataList.sort((a, b) => {
					const diff = (a.lastUpdateTime ?? 0) - (b.lastUpdateTime ?? 0);

					if (diff === 0) {
						// Break ties based on id (id auto-increments).
						return a.id - b.id;
					} else {
						return diff;
					}
				});

				resolve(imageMetadataList.map(metadata => {
					return this.createStoreEntry(metadata);
				}));
			};

			keyRequest.onerror = (event) => {
				reject(event);
			};
		});
	}

	public createNewEntry(): Promise<StoreEntry | null> {
		const metadata = {
			name: this.localization.untitledImage,
			lastUpdateTime: (new Date()).getTime(),
		};

		const transaction = this.db.transaction([ imageMetadataStoreName, imageDataStoreName ], 'readwrite');

		return new Promise<StoreEntry | null>((resolve, reject) => {
			const addMetadataRequest = transaction.objectStore(imageMetadataStoreName).add(metadata);
			const addImageRequest = transaction.objectStore(imageDataStoreName).add({ data: '' });

			addMetadataRequest.onerror = () => reject('Error adding image metadata: ' + addMetadataRequest.error);
			addImageRequest.onerror = () => reject('Error adding image data: ' + addImageRequest.error);

			const eventToId = (event: any) => parseInt(event.target.result);

			let onSuccess = (event: any) => {
				const id = eventToId(event);

				// Replace the onSuccess callback: We need both to be successful to resolve.
				onSuccess = (event: any) => {
					const otherId = eventToId(event);

					if (eventToId(event) !== id) {
						reject(`Error creating new image:
								IDs assigned to image and metadata don't match (${id}, ${otherId})`);
						return;
					}

					resolve(this.createStoreEntry({ id, ...metadata }));
				};
			};

			addMetadataRequest.onsuccess = (event) => onSuccess(event);
			addImageRequest.onsuccess = (event) => onSuccess(event);
		});
	}
}
