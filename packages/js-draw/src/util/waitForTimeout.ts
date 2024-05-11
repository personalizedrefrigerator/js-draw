// Returns a promise that resolves after `timeout` milliseconds.
const waitForTimeout = (timeout: number): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), timeout);
	});
};

export default waitForTimeout;
