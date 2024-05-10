
const waitForImageLoad = async (image: HTMLImageElement) => {
	if (!image.complete) {
		await new Promise((resolve, reject) => {
			image.onload = event => resolve(event);

			// TODO(v2): Return a new Error(event.message)
			// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Forwarding an error-like object.
			image.onerror = event => reject(event);
			// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Forwarding an error-like object.
			image.onabort = event => reject(event);
		});
	}
};

export default waitForImageLoad;
