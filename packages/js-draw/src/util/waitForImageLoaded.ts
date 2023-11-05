
const waitForImageLoad = async (image: HTMLImageElement) => {
	if (!image.complete) {
		await new Promise((resolve, reject) => {
			image.onload = resolve;
			image.onerror = reject;
			image.onabort = reject;
		});
	}
};

export default waitForImageLoad;
