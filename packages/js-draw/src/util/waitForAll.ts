
/**
 * Resolves when all given promises have resolved. If no promises are given,
 * does not return a Promise.
 */
const waitForAll = (results: (Promise<void>|void)[]): Promise<void>|void => {
	// If any are Promises...
	if (results.some(command => command && command['then'])) {
		// Wait for all commands to finish.
		return Promise.all(results)
		// Ensure we return a Promise<void> and not a Promise<void[]>
			.then(() => {});
	}

	return;
};

export default waitForAll;