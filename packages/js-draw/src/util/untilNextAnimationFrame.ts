/** @internal */
const untilNextAnimationFrame = (): Promise<void> => {
	return new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});
};

export default untilNextAnimationFrame;
