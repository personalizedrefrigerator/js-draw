
const makeSeparator = (header: string = '') => {
	const container = document.createElement('div');
	container.classList.add('tool-dropdown-separator');
	container.innerText = header;

	return {
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
	};
};

export default makeSeparator;