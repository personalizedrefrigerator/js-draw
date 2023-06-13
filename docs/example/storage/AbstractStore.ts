import ImageSaver from './ImageSaver';

export interface StoreEntry extends ImageSaver {
    title: string;
    getIcon(): Element;

    delete(): Promise<void>;
    write(newContent: string): Promise<void>;
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
    createNewEntry(): Promise<StoreEntry|null>;
}

export default AbstractStore;
