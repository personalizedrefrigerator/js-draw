
/**
 * Returns true iff all elements in the shorter list equal (===) the elements
 * in the longer list.
 */
const listPrefixMatch = <T> (a: T[], b: T[]) => {
	const shorter = a.length < b.length ? a : b;
	const longer = shorter === a ? b : a;

	for (let i = 0; i < shorter.length; i++) {
		if (shorter[i] !== longer[i]) {
			return false;
		}
	}

	return true;
};

export default listPrefixMatch;
