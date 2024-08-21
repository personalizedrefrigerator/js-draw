
/**
 * Returns a size in bytes, KiB, or MiB with units suffix.
 */
const bytesToSizeString = (sizeBytes: number) => {
	const sizeInKiB = sizeBytes / 1024;
	const sizeInMiB = sizeInKiB / 1024;
	const sizeInGiB = sizeInMiB / 1024;

	let units = 'B';
	let size = sizeBytes;

	if (sizeInGiB >= 1) {
		size = sizeInGiB;
		units = 'GiB';
	} else if (sizeInMiB >= 1) {
		size = sizeInMiB;
		units = 'MiB';
	} else if (sizeInKiB >= 1) {
		size = sizeInKiB;
		units = 'KiB';
	}

	return { size, units };
};

export default bytesToSizeString;