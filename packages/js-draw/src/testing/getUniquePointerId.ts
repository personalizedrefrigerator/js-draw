import Pointer from '../Pointer';

/** Returns the smallest ID not used by the pointers in the given list. */
const getUniquePointerId = (pointers: Pointer[]) => {
	let ptrId = 0;

	const pointerIds = pointers.map(ptr => ptr.id);
	pointerIds.sort();
	for (const pointerId of pointerIds) {
		if (ptrId === pointerId) {
			ptrId = pointerId + 1;
		}
	}

	return ptrId;
};

export default getUniquePointerId;