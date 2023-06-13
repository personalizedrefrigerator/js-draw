import ImageSaver from './ImageSaver';

/**
 * Returns an `ImageSaver` that can update the content of a `FileSystemHandle`.
 *
 * This is used by {@link showSavePopup}.
 */
const makeFileSaver = (fileName: string, file: FileSystemHandle): ImageSaver => {
	return {
		title: fileName,
		write: async (svgData: string): Promise<void> => {
			try {
				// As of 2/21/2023, TypeScript does not recognise createWritable
				// as a property of FileSystemHandle.
				const writable = await (file as any).createWritable();
				await writable.write(svgData);
				await writable.close();
			} catch(e) {
				throw `Error saving to filesystem: ${e}`;
			}
		},

		// Doesn't support updating the title/preview.
		updateTitle: null,
		updatePreview: null,
	};
};

export default makeFileSaver;