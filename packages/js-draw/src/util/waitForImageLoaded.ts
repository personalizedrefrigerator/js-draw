
const waitForImageLoad = async (image: HTMLImageElement) => {
	if (!image.complete) {
		await new Promise((resolve, reject) => {
			image.onload = event => resolve(event);
			image.onerror = event => reject(event);
			image.onabort = event => reject(event);
		});
	}
};

export default waitForImageLoad;
