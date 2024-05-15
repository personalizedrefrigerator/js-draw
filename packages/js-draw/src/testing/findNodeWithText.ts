/** Returns the first node or element with `textContent` matching `expectedText`. */
const findNodeWithText = (expectedText: string, parent: Node): Node|null => {
	if (parent.textContent === expectedText) {
		return parent;
	}

	for (const child of parent.childNodes) {
		const results = findNodeWithText(expectedText, child);
		if (results) {
			return results;
		}
	}

	return null;
};

export default findNodeWithText;