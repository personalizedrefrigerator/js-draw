interface Options {
	tag?: string;
}

/** Returns the first node or element with `textContent` matching `expectedText`. */
const findNodeWithText = (expectedText: string, parent: Node, options: Options): Node | null => {
	const { tag } = options;

	if (parent.textContent === expectedText) {
		const matchesTag = parent instanceof Element && (!tag || tag.toUpperCase() === parent.tagName);

		if (matchesTag) {
			return parent;
		}
	}

	for (const child of parent.childNodes) {
		const results = findNodeWithText(expectedText, child, options);
		if (results) {
			return results;
		}
	}

	return null;
};

export default findNodeWithText;
