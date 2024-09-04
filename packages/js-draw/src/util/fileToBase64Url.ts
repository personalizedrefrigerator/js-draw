export interface FileToBase64UrlOptions {
	onprogress?: (evt: ProgressEvent<FileReader>) => void;
	onWarning?: (message: string, error: any) => void;
}

/**
 * Converts `file` to a base64 data URL.
 */
const fileToBase64Url = async (
	file: Blob,
	options: FileToBase64UrlOptions = {},
): Promise<string | null> => {
	try {
		const reader = new FileReader();

		return await new Promise((resolve: (result: string | null) => void, reject) => {
			reader.onload = () => resolve(reader.result as string | null);
			reader.onerror = reject;
			reader.onabort = reject;
			reader.onprogress = (evt) => {
				options.onprogress?.(evt);
			};

			reader.readAsDataURL(file);
		});
	} catch (error) {
		// Files can fail to load with a FileReader in some cases. For example,
		// in iOS Lockdown mode, where FileReader is unavailable.
		(options.onWarning ?? console.warn)(
			'Unable to convert file to base64 with a FileReader: ',
			error,
		);

		const arrayBuffer = await file.arrayBuffer();
		const array = new Uint8Array(arrayBuffer);

		// step: must be divisible by 3 (3 bytes = 4 base64 numerals)
		//       If too large, this will fail (String.fromCharCode accepts a limited
		//       number of arguments).
		const step = 30;
		const result = [];

		for (let i = 0; i < array.length; i += step) {
			// btoa accepts only characters with byte value 0-255 (which can be created
			// with String.fromCharCode)
			const stringByteArray = String.fromCharCode(...array.slice(i, i + step));
			result.push(btoa(stringByteArray));
		}

		return `data:${file.type ?? 'image/*'};base64,${result.join('')}`;
	}
};

export default fileToBase64Url;
