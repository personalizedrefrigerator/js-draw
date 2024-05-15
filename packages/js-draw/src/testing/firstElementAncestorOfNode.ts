
/** Returns the first ancestor of the given node that is an HTMLElement */
const firstElementAncestorOfNode = (node: Node|null): HTMLElement|null => {
	if (node instanceof HTMLElement) {
		return node;
	} else if (node?.parentNode) {
		return firstElementAncestorOfNode(node.parentNode);
	}
	return null;
};

export default firstElementAncestorOfNode;