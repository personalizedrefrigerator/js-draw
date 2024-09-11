import ImageSaver from './ImageSaver';

/**
 * Represents an image and its metadata. Such an entry implements
 * ImageSaver so that changes can be made to the image, its title, etc.
 */
export interface StoreEntry extends ImageSaver {
	/** The name of the image */
	title: string;

	/** A prevew image that can be shown before opening the full image. */
	getIcon(): Element;

	/** Delete the image and its metadata. */
	delete(): Promise<void>;

	/** Overwrite the image with new content. */
	write(newContent: string): Promise<void>;

	/** Read the content of the image. */
	read(): Promise<string>;
}

/**
 * An `interface` to be implemented by all methods of saving/retreiving
 * multiple images.
 *
 * Instances of this `interface` provide a way of reading/writing/deleting
 * images.
 */
interface AbstractStore {
	getEntries(): Promise<StoreEntry[]>;

	/** Creates a new `StoreEntry` or, on error, returns `null`. */
	createNewEntry(): Promise<StoreEntry | null>;
}

export default AbstractStore;
