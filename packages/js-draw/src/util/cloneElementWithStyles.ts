
/**
 * Makes a clone of `element` and recursively applies styles from the original to the
 * clone's children.
 */
const cloneElementWithStyles = (element: HTMLElement) => {
	const restyle = (originalElement: HTMLElement, clonedElement: HTMLElement) => {
		const originalComputedStyle = getComputedStyle(originalElement);

		for (const propertyName of originalComputedStyle) {
			const propertyValue = originalComputedStyle.getPropertyValue(propertyName);
			clonedElement.style.setProperty(propertyName, propertyValue);
		}

		for (let i = 0; i < originalElement.children.length; i++) {
			const originalChild = originalElement.children.item(i) as HTMLElement;
			const clonedChild = clonedElement.children.item(i) as HTMLElement;

			if (originalChild && clonedChild) {
				restyle(originalChild, clonedChild);
			} else {
				console.warn('CloneElement: Missing child');
			}
		}
	};

	const elementClone = element.cloneNode(true) as HTMLElement;
	restyle(element, elementClone);
	return elementClone;
};

export default cloneElementWithStyles;
