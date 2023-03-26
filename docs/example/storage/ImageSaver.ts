
// Represents a method of saving an image (e.g. to localStorage).
interface ImageSaver {
	// Returns a message describing whether the image was saved
	write(svgData: string): Promise<void>;

	title: string;

    updatePreview: ((newPreviewData: string)=>Promise<void>)|null;
    updateTitle: ((newTitle: string)=>Promise<void>)|null;
}

export default ImageSaver;
