import ImageSaver from './ImageSaver';

export interface StoreEntry extends ImageSaver {
    title: string;
    getIcon(): Element;

    delete(): Promise<void>;
    write(newContent: string): Promise<void>;
    read(): Promise<string>;
}

interface AbstractStore {
    getEntries(): Promise<StoreEntry[]>;
    createNewEntry(): Promise<StoreEntry|null>;
}

export default AbstractStore;
