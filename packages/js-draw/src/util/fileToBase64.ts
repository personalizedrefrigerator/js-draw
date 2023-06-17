
type ProgressListener = (evt: ProgressEvent<FileReader>)=> void;
const fileToBase64 = (file: File, onprogress?: ProgressListener): Promise<string|null> => {
	const reader = new FileReader();

	return new Promise((resolve: (result: string|null)=>void, reject) => {
		reader.onload = () => resolve(reader.result as string|null);
		reader.onerror = reject;
		reader.onabort = reject;
		reader.onprogress = (evt) => {
			onprogress?.(evt);
		};

		reader.readAsDataURL(file);
	});
};

export default fileToBase64;